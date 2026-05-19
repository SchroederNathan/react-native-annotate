import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { Annotation } from '../types';

type Props = {
  visible: boolean;
  annotations: Annotation[];
  onClose: () => void;
  onCopy: () => Promise<void>;
  onRemove: (id: string) => void;
  onClear: () => void;
};

export function AnnotationDrawer({
  visible,
  annotations,
  onClose,
  onCopy,
  onRemove,
  onClear,
}: Props) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>(
    'idle'
  );

  const handleCopy = async () => {
    try {
      await onCopy();
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
    setTimeout(() => setCopyState('idle'), 1800);
  };

  const copyLabel =
    copyState === 'copied'
      ? 'Copied!'
      : copyState === 'error'
        ? 'Copy failed'
        : `Copy ${annotations.length || ''} as markdown`.trim();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Annotations</Text>
            <Text style={styles.count}>
              {annotations.length} {annotations.length === 1 ? 'note' : 'notes'}
            </Text>
          </View>

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listInner}
          >
            {annotations.length === 0 ? (
              <Text style={styles.empty}>
                No annotations yet. Tap the floating button to enter annotation
                mode, then tap any element.
              </Text>
            ) : (
              annotations.map((annotation, idx) => (
                <View key={annotation.id} style={styles.item}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemTitle}>
                      {idx + 1}.{' '}
                      <Text style={styles.itemMono}>
                        {'<'}
                        {annotation.component?.name ?? 'Unknown'}
                        {' />'}
                      </Text>
                    </Text>
                    <Pressable
                      onPress={() => onRemove(annotation.id)}
                      hitSlop={8}
                    >
                      <Text style={styles.removeText}>Remove</Text>
                    </Pressable>
                  </View>
                  {annotation.component?.fileName ? (
                    <Text style={styles.itemSource}>
                      {annotation.component.fileName
                        .split('/')
                        .slice(-3)
                        .join('/')}
                      {annotation.component.lineNumber != null
                        ? `:${annotation.component.lineNumber}`
                        : ''}
                    </Text>
                  ) : (
                    <Text style={styles.itemSource}>(source unavailable)</Text>
                  )}
                  <Text style={styles.itemNote}>
                    {annotation.note || '(empty note)'}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              onPress={onClear}
              disabled={annotations.length === 0}
              style={({ pressed }) => [
                styles.button,
                styles.secondary,
                pressed && styles.pressed,
                annotations.length === 0 && styles.disabled,
              ]}
            >
              <Text style={styles.secondaryText}>Clear all</Text>
            </Pressable>
            <Pressable
              onPress={handleCopy}
              disabled={annotations.length === 0}
              style={({ pressed }) => [
                styles.button,
                styles.primary,
                pressed && styles.pressed,
                annotations.length === 0 && styles.disabled,
              ]}
            >
              <Text style={styles.primaryText}>{copyLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
    maxHeight: '80%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  count: {
    fontSize: 13,
    color: '#64748B',
  },
  list: {
    maxHeight: 380,
  },
  listInner: {
    paddingBottom: 12,
  },
  empty: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingVertical: 24,
  },
  item: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
  },
  itemMono: {
    fontWeight: '700',
  },
  itemSource: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  itemNote: {
    color: '#0F172A',
    fontSize: 14,
    marginTop: 8,
    lineHeight: 19,
  },
  removeText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primary: {
    backgroundColor: '#6366F1',
  },
  secondary: {
    backgroundColor: '#F1F5F9',
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryText: {
    color: '#475569',
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.4,
  },
});
