import { useRef } from 'react';
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
  onOpenDrawer: () => void;
};

export function FloatingToggle({
  annotationMode,
  pendingCount,
  onToggleMode,
  onOpenDrawer,
}: Props) {
  const position = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const offset = useRef({ x: 0, y: 0 });
  const dragged = useRef(false);

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
          styles.fab,
          annotationMode && styles.fabActive,
          pressed && styles.pressed,
        ]}
      >
        <Text style={[styles.fabIcon, annotationMode && styles.fabIconActive]}>
          {annotationMode ? '×' : '✎'}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => {
          if (!dragged.current) onOpenDrawer();
        }}
        style={({ pressed }) => [styles.list, pressed && styles.pressed]}
      >
        <Text style={styles.listIcon}>≡</Text>
        {pendingCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pendingCount}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    bottom: 60,
    alignItems: 'center',
    zIndex: 9999,
    gap: 10,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabActive: {
    backgroundColor: '#0F172A',
  },
  fabIcon: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '600',
    lineHeight: 28,
  },
  fabIconActive: {
    fontSize: 32,
  },
  list: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
  },
  listIcon: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
});
