import { useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Props = {
  annotationMode: boolean;
  pendingCount: number;
  onToggleMode: () => void;
  onCopy: () => Promise<void>;
};

type CopyState = 'idle' | 'copied' | 'error';

export function FloatingToggle({
  annotationMode,
  pendingCount,
  onToggleMode,
  onCopy,
}: Props) {
  const position = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const offset = useRef({ x: 0, y: 0 });
  const dragged = useRef(false);
  const [copyState, setCopyState] = useState<CopyState>('idle');

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
      onPanResponderGrant: () => {
        dragged.current = false;
        position.setOffset(offset.current);
        position.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_e, g) => {
        if (Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4) dragged.current = true;
        position.setValue({ x: g.dx, y: g.dy });
      },
      onPanResponderRelease: (_e, g) => {
        offset.current = {
          x: offset.current.x + g.dx,
          y: offset.current.y + g.dy,
        };
        position.flattenOffset();
      },
    })
  ).current;

  const handleCopy = async () => {
    if (dragged.current || pendingCount === 0) return;
    try {
      await onCopy();
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
    setTimeout(() => setCopyState('idle'), 1200);
  };

  const copyDisabled = pendingCount === 0;
  const copyGlyph =
    copyState === 'copied' ? '✓' : copyState === 'error' ? '✕' : '⧉';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX: position.x }, { translateY: position.y }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <Pressable
        onPress={() => {
          if (!dragged.current) onToggleMode();
        }}
        style={({ pressed }) => [
          styles.cell,
          annotationMode && styles.cellActive,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.icon}>{annotationMode ? '✦' : '✧'}</Text>
      </Pressable>
      <View style={styles.divider} />
      <Pressable
        onPress={handleCopy}
        disabled={copyDisabled}
        style={({ pressed }) => [
          styles.cell,
          pressed && !copyDisabled && styles.pressed,
          copyDisabled && styles.disabled,
        ]}
      >
        <Text style={styles.icon}>{copyGlyph}</Text>
        {pendingCount > 0 && copyState === 'idle' && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pendingCount}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const PILL_HEIGHT = 56;
const CELL_SIZE = 56;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    bottom: 60,
    flexDirection: 'row',
    alignItems: 'center',
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
    backgroundColor: '#000000',
    overflow: 'hidden',
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellActive: {
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderRadius: PILL_HEIGHT / 2,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  icon: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '500',
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.35,
  },
});
