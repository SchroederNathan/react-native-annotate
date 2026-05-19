import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { AnnotationContext } from './context';
import { AnnotationDrawer } from './components/AnnotationDrawer';
import { AnnotationMarker } from './components/AnnotationMarker';
import { FloatingToggle } from './components/FloatingToggle';
import { NotePrompt } from './components/NotePrompt';
import { TouchInterceptor } from './components/TouchInterceptor';
import { copyToClipboard } from './clipboard';
import {
  findComponentAtPoint,
  type ComponentInfo,
} from './findComponentAtPoint';
import { formatAnnotationsAsMarkdown } from './formatMarkdown';
import type { Annotation, AnnotationContextValue } from './types';

export type AnnotationProviderProps = {
  children: ReactNode;
  enabled?: boolean;
};

export function AnnotationProvider({
  children,
  enabled,
}: AnnotationProviderProps) {
  const shouldRun = enabled ?? __DEV__;
  if (!shouldRun) {
    return <>{children}</>;
  }
  return <AnnotationProviderImpl>{children}</AnnotationProviderImpl>;
}

type PendingTap = {
  x: number;
  y: number;
  component: ComponentInfo | null;
};

function AnnotationProviderImpl({ children }: { children: ReactNode }) {
  const rootRef = useRef<ComponentRef<typeof View>>(null);
  const [annotationMode, setAnnotationMode] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [pendingTap, setPendingTap] = useState<PendingTap | null>(null);

  const addAnnotation = useCallback(
    (input: Omit<Annotation, 'id' | 'createdAt'>) => {
      const annotation: Annotation = {
        ...input,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: Date.now(),
      };
      setAnnotations((prev) => [...prev, annotation]);
      return annotation;
    },
    []
  );

  const updateAnnotation = useCallback(
    (id: string, patch: Partial<Pick<Annotation, 'note'>>) => {
      setAnnotations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...patch } : a))
      );
    },
    []
  );

  const removeAnnotation = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAnnotations = useCallback(() => {
    setAnnotations([]);
  }, []);

  const copyAsMarkdown = useCallback(async () => {
    const markdown = formatAnnotationsAsMarkdown(annotations);
    await copyToClipboard(markdown);
  }, [annotations]);

  const handleTap = useCallback(async (x: number, y: number) => {
    // Unmount the TouchInterceptor first — otherwise the native inspector
    // hit-test lands on the overlay (a library-internal View with no JSX
    // __source) instead of the actual app component under the tap.
    setAnnotationMode(false);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve())
    );
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve())
    );
    // Pass the host instance (ref.current) directly — on Fabric the renderer
    // hit-tests by host instance, not by numeric node tag, so findNodeHandle
    // returns the wrong shape of identifier.
    const component = await findComponentAtPoint(rootRef.current, x, y);
    setPendingTap({ x, y, component });
  }, []);

  const handleSaveNote = useCallback(
    (note: string) => {
      if (pendingTap) {
        addAnnotation({
          x: pendingTap.x,
          y: pendingTap.y,
          component: pendingTap.component,
          note,
        });
      }
      setPendingTap(null);
    },
    [addAnnotation, pendingTap]
  );

  const contextValue = useMemo<AnnotationContextValue>(
    () => ({
      enabled: annotationMode,
      setEnabled: setAnnotationMode,
      annotations,
      addAnnotation,
      updateAnnotation,
      removeAnnotation,
      clearAnnotations,
      copyAsMarkdown,
    }),
    [
      addAnnotation,
      annotationMode,
      annotations,
      clearAnnotations,
      copyAsMarkdown,
      removeAnnotation,
      updateAnnotation,
    ]
  );

  return (
    <AnnotationContext.Provider value={contextValue}>
      <View ref={rootRef} collapsable={false} style={styles.root}>
        {children}
        {annotations.map((annotation, idx) => (
          <AnnotationMarker
            key={annotation.id}
            annotation={annotation}
            index={idx}
          />
        ))}
        <TouchInterceptor active={annotationMode} onTap={handleTap} />
        <FloatingToggle
          annotationMode={annotationMode}
          pendingCount={annotations.length}
          onToggleMode={() => setAnnotationMode((m) => !m)}
          onOpenDrawer={() => setDrawerVisible(true)}
        />
        <NotePrompt
          visible={pendingTap !== null}
          component={pendingTap?.component ?? null}
          onSave={handleSaveNote}
          onCancel={() => setPendingTap(null)}
        />
        <AnnotationDrawer
          visible={drawerVisible}
          annotations={annotations}
          onClose={() => setDrawerVisible(false)}
          onCopy={copyAsMarkdown}
          onRemove={removeAnnotation}
          onClear={clearAnnotations}
        />
      </View>
    </AnnotationContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
