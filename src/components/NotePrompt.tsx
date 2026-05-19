import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { ComponentInfo } from '../findComponentAtPoint';

type Props = {
  visible: boolean;
  component: ComponentInfo | null;
  onSave: (note: string) => void;
  onCancel: () => void;
};

export function NotePrompt({ visible, component, onSave, onCancel }: Props) {
  const [note, setNote] = useState('');

  useEffect(() => {
    if (visible) setNote('');
  }, [visible]);

  const componentLabel = component?.name ?? 'Unknown';
  const sourceLabel = component?.fileName
    ? `${component.fileName.split('/').slice(-2).join('/')}${
        component.lineNumber != null ? `:${component.lineNumber}` : ''
      }`
    : 'source unavailable';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.title}>
            {'<'}
            {componentLabel}
            {' />'}
          </Text>
          <Text style={styles.subtitle}>{sourceLabel}</Text>
          <TextInput
            style={styles.input}
            placeholder="What's your feedback?"
            placeholderTextColor="#9CA3AF"
            value={note}
            onChangeText={setNote}
            autoFocus
            multiline
            numberOfLines={4}
          />
          <View style={styles.row}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.button,
                styles.cancel,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => onSave(note)}
              style={({ pressed }) => [
                styles.button,
                styles.save,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 16,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#0F172A',
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 8,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cancel: {
    backgroundColor: 'transparent',
  },
  save: {
    backgroundColor: '#6366F1',
  },
  cancelText: {
    color: '#475569',
    fontWeight: '600',
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
