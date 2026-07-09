import { useEffect } from 'react';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Checkmark inside a 24x24 box; measured length ~= 22 (constant, since
// getTotalLength() returns 0 on iOS — see react-native-svg #1336).
const CHECK_PATH = 'M5 13 l4 4 l10 -12';
const LEN = 22;

export function CompletionCheck({ color, size = 18 }: { color: string; size?: number }) {
  const reduceMotion = useReducedMotion();
  const draw = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (!reduceMotion) draw.value = withTiming(1, { duration: 320 });
  }, [reduceMotion, draw]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: LEN * (1 - draw.value),
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <AnimatedPath
        d={CHECK_PATH}
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={LEN}
        animatedProps={animatedProps}
      />
    </Svg>
  );
}
