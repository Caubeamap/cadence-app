import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../theme/useTheme';
import { type } from '../theme/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 44;
const STROKE = 4;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

interface Props {
  ratio: number;
  done: number;
  total: number;
}

export function DayProgressRing({ ratio, done, total }: Props) {
  const c = useTheme();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(ratio);

  useEffect(() => {
    progress.value = reduceMotion ? ratio : withTiming(ratio, { duration: 600 });
  }, [ratio, reduceMotion, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: C * (1 - progress.value),
  }));

  return (
    <View style={styles.wrap} accessibilityLabel={`Đã xong ${done} trên ${total} việc`}>
      <Svg width={SIZE} height={SIZE}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={c.hairline} strokeWidth={STROKE} fill="none" />
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          stroke={c.accent}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={C}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </Svg>
      <View style={styles.label}>
        <Text style={[type.caption, { color: c.ink, fontWeight: '600' }]}>{done}</Text>
        <Text style={[styles.total, { color: c.inkMuted }]}>/{total}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  label: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  total: { fontSize: 10 },
});
