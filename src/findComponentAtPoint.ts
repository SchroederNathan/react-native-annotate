import { UIManager } from 'react-native';

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

function getEntrySource(entry: InspectorHierarchyEntry): InspectorSource | undefined {
  if (entry.source && entry.source.fileName) return entry.source;
  try {
    const data = entry.getInspectorData?.();
    if (data?.source?.fileName) return data.source;
  } catch {
    // ignore
  }
  return undefined;
}

type GetInspectorDataFn = (
  rootTag: number,
  x: number,
  y: number,
  callback: (data: InspectorData | undefined) => void
) => void;

function resolveInspectorApi(): GetInspectorDataFn | null {
  const anyUIManager = UIManager as unknown as {
    getInspectorDataForViewAtPoint?: GetInspectorDataFn;
  };
  if (typeof anyUIManager.getInspectorDataForViewAtPoint === 'function') {
    return anyUIManager.getInspectorDataForViewAtPoint.bind(anyUIManager);
  }
  return null;
}

export async function findComponentAtPoint(
  rootTag: number | null | undefined,
  x: number,
  y: number
): Promise<ComponentInfo | null> {
  if (rootTag == null) return null;
  const getInspectorData = resolveInspectorApi();
  if (!getInspectorData) return null;

  try {
    const data = await new Promise<InspectorData | undefined>((resolve) => {
      getInspectorData(rootTag, x, y, (result) => resolve(result));
    });

    if (!data || !data.hierarchy || data.hierarchy.length === 0) return null;

    const hierarchy = data.hierarchy;
    const selectedIdx =
      typeof data.selectedIndex === 'number'
        ? data.selectedIndex
        : hierarchy.length - 1;

    // Walk from the tapped (deepest) entry up toward the root, looking for
    // the first one that is (a) user-written (has __source metadata) and
    // (b) not a primitive host component. This finds e.g. <ProfileCard />
    // rather than the inner <View /> the user actually touched.
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

    // Fallback: any entry with source info, even if host-named.
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

    // Final fallback: the originally selected entry, even with no source.
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
