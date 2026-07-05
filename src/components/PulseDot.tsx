import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

export function PulseDot({ color }: { color: string }) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!reduceMotion) {
      progress.value = withRepeat(withTiming(1, { duration: 1400 }), -1, false);
    }
  }, [reduceMotion, progress]);

  const ring = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ scale: 1 + progress.value }],
  }));

  return (
    <View style={styles.wrap}>
      {!reduceMotion && <Animated.View style={[styles.ring, { backgroundColor: color }, ring]} />}
      <View style={[styles.core, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 12, height: 12, borderRadius: 6 },
  core: { width: 10, height: 10, borderRadius: 5 },
});
