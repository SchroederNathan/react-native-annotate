import { StyleSheet, Text, View } from 'react-native';
import type { Annotation } from '../types';

type Props = {
  annotation: Annotation;
  index: number;
};

export function AnnotationMarker({ annotation, index }: Props) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.marker,
        {
          left: annotation.x - MARKER_SIZE / 2,
          top: annotation.y - MARKER_SIZE / 2,
        },
      ]}
    >
      <Text style={styles.label}>{index + 1}</Text>
    </View>
  );
}

const MARKER_SIZE = 28;

const styles = StyleSheet.create({
  marker: {
    position: 'absolute',
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    backgroundColor: '#000000',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9997,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
