import { Pressable, StyleSheet, Text, View } from 'react-native';
import { todayISO, weekOf } from '../core/date';
import { useTheme } from '../theme/useTheme';
import { radii, space, type } from '../theme/tokens';

const DOW_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

interface Props {
  selected: string;
  counts: Record<string, number>;
  onSelect: (date: string) => void;
}

export function WeekStrip({ selected, counts, onSelect }: Props) {
  const c = useTheme();
  const today = todayISO();
  const week = weekOf(today);

  return (
    <View style={styles.row}>
      {week.map((date, i) => {
        const isSelected = date === selected;
        const isToday = date === today;
        const dots = Math.min(counts[date] ?? 0, 3);
        return (
          <Pressable
            key={date}
            accessibilityLabel={`${DOW_LABELS[i]} ngày ${Number(date.slice(8))}, ${counts[date] ?? 0} việc`}
            style={[
              styles.cell,
              isSelected && { backgroundColor: c.accentSoft, borderColor: c.accent },
              !isSelected && { borderColor: 'transparent' },
            ]}
            onPress={() => onSelect(date)}
          >
            <Text style={[type.caption, { color: isToday ? c.accent : c.inkMuted }]}>{DOW_LABELS[i]}</Text>
            <Text style={[type.section, { color: isSelected ? c.accent : c.ink }]}>
              {Number(date.slice(8))}
            </Text>
            <View style={styles.dots}>
              {Array.from({ length: dots }, (_, d) => (
                <View key={d} style={[styles.dot, { backgroundColor: c.inkMuted }]} />
              ))}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: space.m, gap: space.xs, paddingBottom: space.s },
  cell: {
    flex: 1,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: radii.s,
    borderWidth: 1,
  },
  dots: { flexDirection: 'row', gap: 3, height: 4 },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
