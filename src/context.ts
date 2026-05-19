import { createContext, useContext } from 'react';
import type { AnnotationContextValue } from './types';

export const AnnotationContext = createContext<AnnotationContextValue | null>(
  null
);

export function useAnnotationContext(): AnnotationContextValue {
  const ctx = useContext(AnnotationContext);
  if (!ctx) {
    throw new Error(
      'react-native-annotate: useAnnotations / useAnnotationContext must be used inside <AnnotationProvider>.'
    );
  }
  return ctx;
}
