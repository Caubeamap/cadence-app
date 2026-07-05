import { StyleSheet, Text, View } from 'react-native';
import { formatDuration } from '../core/daySummary';
import { useTheme } from '../theme/useTheme';
import { space, type } from '../theme/tokens';

export function GapRow({ minutes }: { minutes: number }) {
  const c = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.timeCol} />
      <View style={styles.railCol}>
        <View style={[styles.railLine, { backgroundColor: c.hairline }]} />
      </View>
      <Text style={[type.caption, { color: c.inkMuted, paddingVertical: space.s }]}>
        trống {formatDuration(minutes)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: space.l },
  timeCol: { width: 44, paddingRight: space.s },
  railCol: { width: 26, alignItems: 'center' },
  railLine: { position: 'absolute', top: 0, bottom: 0, width: 1 },
});
