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
  methodName?: string | null;
  file?: string | null;
  lineNumber?: number | null;
  column?: number | null;
};

type SymbolicateResult = {
  stack?: Array<RNStackFrame>;
};

// Lazy-load RN's internal stack utilities. They live at private-ish paths
// (Libraries/Core/Devtools/...) but are stable across RN 0.70+. Wrapped in
// try/catch so the library still works on older RN or non-Metro setups.
function loadStackUtils(): {
  parseErrorStack?: (stack: string) => RNStackFrame[];
  symbolicateStackTrace?: (
    stack: RNStackFrame[]
  ) => Promise<SymbolicateResult>;
} {
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const parsed = require('react-native/Libraries/Core/Devtools/parseErrorStack');
    const sym = require('react-native/Libraries/Core/Devtools/symbolicateStackTrace');
    /* eslint-enable */
    return {
      parseErrorStack: parsed?.default ?? parsed,
      symbolicateStackTrace: sym?.default ?? sym,
    };
  } catch {
    return {};
  }
}

// Symbolicate a React-19 componentStack against Metro's source map. The
// componentStack from the renderer is in bundle coordinates (something like
// `at MyComponent (.../index.bundle?...:108072:21)`); Metro's /symbolicate
// endpoint resolves each frame back to its original source path and line.
async function symbolicateComponentStack(
  rawStack: string
): Promise<ParsedStackFrame[]> {
  const { parseErrorStack, symbolicateStackTrace } = loadStackUtils();
  if (!parseErrorStack || !symbolicateStackTrace) return [];

  let parsed: RNStackFrame[];
  try {
    parsed = parseErrorStack(rawStack);
  } catch {
    return [];
  }
  if (!parsed.length) return [];

  let result: SymbolicateResult;
  try {
    result = await symbolicateStackTrace(parsed);
  } catch {
    // Metro not reachable — fall back to bundle-relative info; better than nothing.
    return parsed
      .filter((f) => f.methodName && f.file)
      .map((f) => ({
        name: f.methodName!,
        source: {
          fileName: f.file ?? undefined,
          lineNumber: f.lineNumber ?? undefined,
          columnNumber: f.column ?? undefined,
        },
      }));
  }

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
  return out;
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
  const hook = (globalThis as { __REACT_DEVTOOLS_GLOBAL_HOOK__?: ReactDevToolsHook })
    .__REACT_DEVTOOLS_GLOBAL_HOOK__;
  const renderers = hook?.renderers ? Array.from(hook.renderers.values()) : [];

  const renderersWithFn = renderers.filter(
    (r) => typeof r?.rendererConfig?.getInspectorDataForViewAtPoint === 'function'
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
      chosen = hierarchy[selectedIdx] ?? hierarchy[hierarchy.length - 1] ?? null;
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
