import { UIManager } from 'react-native';

export type ComponentInfo = {
  name: string;
  fileName?: string;
  lineNumber?: number;
  columnNumber?: number;
};

type InspectorHierarchyEntry = {
  name?: string;
  getInspectorData?: () => unknown;
};

type InspectorData = {
  hierarchy?: InspectorHierarchyEntry[];
  source?: {
    fileName?: string;
    lineNumber?: number;
    columnNumber?: number;
  };
  selectedIndex?: number;
};

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

    const idx =
      typeof data.selectedIndex === 'number'
        ? data.selectedIndex
        : data.hierarchy.length - 1;
    const entry =
      data.hierarchy[idx] ?? data.hierarchy[data.hierarchy.length - 1];
    const name = entry?.name?.trim() || 'Unknown';

    return {
      name,
      fileName: data.source?.fileName,
      lineNumber: data.source?.lineNumber,
      columnNumber: data.source?.columnNumber,
    };
  } catch {
    return null;
  }
}
