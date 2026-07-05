import { StyleSheet, Text, View } from 'react-native';
import { ParsedTask } from '../core/parser/parseTask';
import { formatDuration } from '../core/daySummary';
import { useTheme } from '../theme/useTheme';
import { radii, space, type } from '../theme/tokens';

export function ParsedPreview({ parsed }: { parsed: ParsedTask }) {
  const c = useTheme();
  const chips: string[] = [
    formatDuration(parsed.durationMin),
    parsed.fixedStart ? `lúc ${parsed.fixedStart}` : 'giờ linh hoạt',
  ];
  if (parsed.deadline) chips.push(`trước ${parsed.deadline}`);
  if (parsed.priority === 'high') chips.push('ưu tiên cao');
  if (parsed.dayOffset === 1) chips.push('ngày mai');
  if (parsed.tag) chips.push(`#${parsed.tag}`);

  return (
    <View style={styles.wrap}>
      {chips.map((label) => (
        <View key={label} style={[styles.chip, { backgroundColor: c.accentSoft }]}>
          <Text style={[type.caption, { color: c.accent }]}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  chip: { paddingHorizontal: space.m, paddingVertical: space.xs + 2, borderRadius: radii.s },
});
