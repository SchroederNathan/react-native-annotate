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
};

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

    // Walk from the tapped entry upward, preferring a user-named component
    // that carries JSX __source metadata. This skips host primitives
    // (View/Text/Pressable/etc.) so we land on the actual component the
    // developer wrote — e.g. <ProfileCard /> not the inner <View />.
    let chosen: InspectorHierarchyEntry | null = null;
    let chosenSource: InspectorSource | undefined;
    for (let i = selectedIdx; i >= 0; i--) {
      const entry = hierarchy[i];
      if (!entry) continue;
      const src = getEntrySource(entry);
      const name = entry.name?.trim();
      if (src?.fileName && name && !HOST_NAMES.has(name)) {
        chosen = entry;
        chosenSource = src;
        break;
      }
    }

    if (!chosen) {
      for (let i = selectedIdx; i >= 0; i--) {
        const entry = hierarchy[i];
        if (!entry) continue;
        const src = getEntrySource(entry);
        if (src?.fileName) {
          chosen = entry;
          chosenSource = src;
          break;
        }
      }
    }

    if (!chosen) {
      chosen = hierarchy[selectedIdx] ?? hierarchy[hierarchy.length - 1] ?? null;
      chosenSource = chosen ? getEntrySource(chosen) ?? data.source : data.source;
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
