import type { ComponentInfo } from './findComponentAtPoint';

export type Annotation = {
  id: string;
  note: string;
  x: number;
  y: number;
  createdAt: number;
  component: ComponentInfo | null;
};

export type AnnotationContextValue = {
  enabled: boolean;
  setEnabled: (next: boolean) => void;
  annotations: Annotation[];
  addAnnotation: (input: Omit<Annotation, 'id' | 'createdAt'>) => Annotation;
  updateAnnotation: (
    id: string,
    patch: Partial<Pick<Annotation, 'note'>>
  ) => void;
  removeAnnotation: (id: string) => void;
  clearAnnotations: () => void;
  copyAsMarkdown: () => Promise<void>;
};
