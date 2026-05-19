import { useRef } from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';

type Props = {
  active: boolean;
  onTap: (x: number, y: number) => void;
};

export function TouchInterceptor({ active, onTap }: Props) {
  const handledRef = useRef(false);

  if (!active) return null;

  const handleRelease = (event: GestureResponderEvent) => {
    if (handledRef.current) return;
    handledRef.current = true;
    const { pageX, pageY } = event.nativeEvent;
    onTap(pageX, pageY);
    setTimeout(() => {
      handledRef.current = false;
    }, 250);
  };

  return (
    <View
      style={styles.overlay}
      pointerEvents="box-only"
      onStartShouldSetResponder={() => true}
      onResponderRelease={handleRelease}
    >
      <View style={styles.tint} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9998,
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
  },
});
