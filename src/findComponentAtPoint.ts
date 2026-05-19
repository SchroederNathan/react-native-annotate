export type ComponentInfo = {
  name: string;
  fileName?: string;
  lineNumber?: number;
  columnNumber?: number;
};

type InspectorSource = {
  fileName?: string;
  lineNumber?: number;
  columnNumber?: number;
};

type InspectorHierarchyEntry = {
  name?: string;
  source?: InspectorSource;
  getInspectorData?: (findNodeHandle?: unknown) => {
    source?: InspectorSource;
    componentStack?: string;
  };
};

type InspectorData = {
  hierarchy?: InspectorHierarchyEntry[];
  source?: InspectorSource;
  selectedIndex?: number;
  componentStack?: string;
};

type ParsedStackFrame = {
  name: string;
  source: InspectorSource;
};

type RNStackFrame = {
  methodName: string;
  file: string;
  lineNumber: number;
  column: number;
};

type SymbolicateResult = {
  stack?: Array<{
    methodName?: string | null;
    file?: string | null;
    lineNumber?: number | null;
    column?: number | null;
  }>;
};

// Parse the componentStack string React 19 builds via stack introspection.
// On Hermes/V8 the frames look like:
//   "    at MyComponent (http://localhost:8081/index.bundle?...:108072:21)"
const FRAME_RE = /at\s+(\S+)\s+\(([^)]+):(\d+):(\d+)\)/;

function parseComponentStack(stack: string): RNStackFrame[] {
  const frames: RNStackFrame[] = [];
  for (const line of stack.split('\n')) {
    const m = FRAME_RE.exec(line);
    if (!m) continue;
    frames.push({
      methodName: m[1]!,
      file: m[2]!,
      lineNumber: Number(m[3]),
      column: Number(m[4]),
    });
  }
  return frames;
}

// Pull the Metro dev server origin out of a bundle URL like
// "http://localhost:8081/index.bundle?platform=ios&...". Returns something
// like "http://localhost:8081/". Returns null for non-URL frames (e.g. the
// JSC/Hermes internal frames that have no http scheme).
function extractDevServerOrigin(file: string): string | null {
  const m = /^(https?:\/\/[^/]+)\//.exec(file);
  return m ? m[1] + '/' : null;
}

// Symbolicate a React 19 componentStack against Metro's source map. The
// componentStack from the renderer is in bundle coordinates (e.g.
// `at MyComponent (.../index.bundle?...:108072:21)`); Metro's /symbolicate
// endpoint resolves each frame back to its original source path and line.
async function symbolicateComponentStack(
  rawStack: string
): Promise<ParsedStackFrame[]> {
  const parsed = parseComponentStack(rawStack);
  if (!parsed.length) return [];

  const devServer = parsed
    .map((f) => extractDevServerOrigin(f.file))
    .find((u): u is string => u != null);

  const unsymbolicated: ParsedStackFrame[] = parsed.map((f) => ({
    name: f.methodName,
    source: {
      fileName: f.file,
      lineNumber: f.lineNumber,
      columnNumber: f.column,
    },
  }));

  const fetchFn = (globalThis as { fetch?: typeof fetch }).fetch;
  if (!devServer || typeof fetchFn !== 'function') return unsymbolicated;

  try {
    const response = await fetchFn(devServer + 'symbolicate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stack: parsed }),
    });
    if (!response.ok) return unsymbolicated;
    const result = (await response.json()) as SymbolicateResult;

    const out: ParsedStackFrame[] = [];
    for (const frame of result.stack ?? []) {
      if (!frame.methodName || !frame.file) continue;
      out.push({
        name: frame.methodName,
        source: {
          fileName: frame.file,
          lineNumber: frame.lineNumber ?? undefined,
          columnNumber: frame.column ?? undefined,
        },
      });
    }
    return out.length ? out : unsymbolicated;
  } catch {
    return unsymbolicated;
  }
}

type GetInspectorDataFn = (
  inspectedView: unknown,
  locationX: number,
  locationY: number,
  callback: (data: InspectorData | undefined) => boolean | void
) => void;

type ReactDevToolsRenderer = {
  rendererConfig?: {
    getInspectorDataForViewAtPoint?: GetInspectorDataFn;
  };
};

type ReactDevToolsHook = {
  renderers?: Map<unknown, ReactDevToolsRenderer>;
};

const HOST_NAMES = new Set([
  'View',
  'RCTView',
  'Text',
  'RCTText',
  'RawText',
  'RCTRawText',
  'ScrollView',
  'RCTScrollView',
  'Image',
  'RCTImageView',
  'TextInput',
  'Pressable',
  'TouchableOpacity',
  'TouchableHighlight',
  'TouchableWithoutFeedback',
  'TouchableNativeFeedback',
]);

function resolveInspectorFn(): GetInspectorDataFn | null {
  // Modern path: walk the React DevTools hook's renderer registry. This is
  // what RN's own in-app Inspector uses on both Paper and Fabric in 0.79+.
  const hook = (
    globalThis as { __REACT_DEVTOOLS_GLOBAL_HOOK__?: ReactDevToolsHook }
  ).__REACT_DEVTOOLS_GLOBAL_HOOK__;
  const renderers = hook?.renderers ? Array.from(hook.renderers.values()) : [];

  const renderersWithFn = renderers.filter(
    (r) =>
      typeof r?.rendererConfig?.getInspectorDataForViewAtPoint === 'function'
  );

  if (renderersWithFn.length === 0) return null;

  return (inspectedView, x, y, callback) => {
    let resolved = false;
    for (const renderer of renderersWithFn) {
      if (resolved) break;
      renderer.rendererConfig!.getInspectorDataForViewAtPoint!(
        inspectedView,
        x,
        y,
        (viewData) => {
          if (viewData && viewData.hierarchy && viewData.hierarchy.length > 0) {
            resolved = true;
            callback(viewData);
            return true;
          }
          return false;
        }
      );
    }
    if (!resolved) callback(undefined);
  };
}

function getEntrySource(
  entry: InspectorHierarchyEntry
): InspectorSource | undefined {
  if (entry.source && entry.source.fileName) return entry.source;
  try {
    const data = entry.getInspectorData?.();
    if (data?.source?.fileName) return data.source;
  } catch {
    // ignore
  }
  return undefined;
}

export async function findComponentAtPoint(
  inspectedView: unknown,
  x: number,
  y: number
): Promise<ComponentInfo | null> {
  if (inspectedView == null) return null;
  const getInspectorData = resolveInspectorFn();
  if (!getInspectorData) return null;

  try {
    const data = await new Promise<InspectorData | undefined>((resolve) => {
      getInspectorData(inspectedView, x, y, (result) => {
        resolve(result);
      });
    });

    if (!data || !data.hierarchy || data.hierarchy.length === 0) return null;

    const hierarchy = data.hierarchy;
    const selectedIdx =
      typeof data.selectedIndex === 'number'
        ? data.selectedIndex
        : hierarchy.length - 1;

    const stackFrames = data.componentStack
      ? await symbolicateComponentStack(data.componentStack)
      : [];

    const findSourceForName = (name: string): InspectorSource | undefined => {
      const frame = stackFrames.find((f) => f.name === name);
      return frame?.source;
    };

    // Walk from the tapped entry upward, preferring a user-named component
    // (skipping View/Text/Pressable/etc.) so we land on the actual component
    // the developer wrote — e.g. <ProfileCard /> not the inner <View />.
    let chosen: InspectorHierarchyEntry | null = null;
    let chosenSource: InspectorSource | undefined;
    for (let i = selectedIdx; i >= 0; i--) {
      const entry = hierarchy[i];
      if (!entry) continue;
      const name = entry.name?.trim();
      if (!name || HOST_NAMES.has(name)) continue;
      const src = getEntrySource(entry) ?? findSourceForName(name);
      if (src?.fileName) {
        chosen = entry;
        chosenSource = src;
        break;
      }
    }

    if (!chosen) {
      // No user component with source — accept any entry with source.
      for (let i = selectedIdx; i >= 0; i--) {
        const entry = hierarchy[i];
        if (!entry) continue;
        const name = entry.name?.trim();
        const src =
          getEntrySource(entry) ?? (name ? findSourceForName(name) : undefined);
        if (src?.fileName) {
          chosen = entry;
          chosenSource = src;
          break;
        }
      }
    }

    if (!chosen) {
      // No source anywhere — return the tapped entry with whatever name it has.
      chosen =
        hierarchy[selectedIdx] ?? hierarchy[hierarchy.length - 1] ?? null;
      const name = chosen?.name?.trim();
      chosenSource =
        getEntrySource(chosen ?? {}) ??
        (name ? findSourceForName(name) : undefined) ??
        data.source;
    }

    const name = chosen?.name?.trim() || 'Unknown';
    return {
      name,
      fileName: chosenSource?.fileName,
      lineNumber: chosenSource?.lineNumber,
      columnNumber: chosenSource?.columnNumber,
    };
  } catch {
    return null;
  }
}
