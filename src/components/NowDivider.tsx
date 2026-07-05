import { StyleSheet, Text, View } from 'react-native';
import { toHHMM } from '../core/time';
import { useTheme } from '../theme/useTheme';
import { space, type } from '../theme/tokens';

export function NowDivider({ nowMin }: { nowMin: number }) {
  const c = useTheme();
  return (
    <View style={styles.wrap} accessibilityLabel={`Bây giờ là ${toHHMM(nowMin)}`}>
      <Text style={[type.time, { color: c.accent }]}>{toHHMM(nowMin)}</Text>
      <View style={[styles.line, { backgroundColor: c.accent }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s,
    paddingHorizontal: space.l,
    paddingVertical: space.xs,
  },
  line: { flex: 1, height: 1.5, borderRadius: 1 },
});
