import type { Annotation } from './types';

function relativizePath(fileName: string | undefined): string | undefined {
  if (!fileName) return undefined;
  const markers = ['/src/', '/app/', '/components/', '/screens/'];
  for (const marker of markers) {
    const idx = fileName.indexOf(marker);
    if (idx >= 0) return fileName.slice(idx + 1);
  }
  const parts = fileName.split('/');
  return parts.length > 4 ? parts.slice(-4).join('/') : fileName;
}

function formatSourceLine(annotation: Annotation): string {
  const c = annotation.component;
  if (!c?.fileName)
    return '_(source unavailable — likely production build or third-party component)_';
  const path = relativizePath(c.fileName) ?? c.fileName;
  const line = c.lineNumber != null ? `:${c.lineNumber}` : '';
  const col = c.columnNumber != null ? `:${c.columnNumber}` : '';
  return `\`${path}${line}${col}\``;
}

function sanitizeNote(note: string): string {
  return note.replace(/\r\n/g, '\n').trim();
}

export function formatAnnotationsAsMarkdown(annotations: Annotation[]): string {
  if (annotations.length === 0) {
    return '# UI feedback for agent\n\n_(no annotations captured)_\n';
  }

  const lines: string[] = ['# UI feedback for agent', ''];
  annotations.forEach((annotation, idx) => {
    const componentName = annotation.component?.name ?? 'Unknown';
    lines.push(`## ${idx + 1}. ${componentName}`);
    lines.push(`- **Source:** ${formatSourceLine(annotation)}`);
    lines.push(`- **Note:** ${sanitizeNote(annotation.note) || '_(empty)_'}`);
    lines.push('');
  });

  return lines.join('\n');
}
