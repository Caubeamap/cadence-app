import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Task } from '../core/types';
import { tagColor } from '../core/tagColor';
import { useTheme } from '../theme/useTheme';
import { radii, space, type } from '../theme/tokens';
import { CompletionCheck } from './CompletionCheck';

interface Props {
  tasks: Task[];
  onOpen: (id: string) => void;
}

export function FinishedList({ tasks, onOpen }: Props) {
  const c = useTheme();
  if (tasks.length === 0) return null;

  const doneCount = tasks.filter((t) => t.status === 'done').length;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={[type.section, { color: c.ink }]}>Đã xong · Đã bỏ qua</Text>
        <Text style={[type.caption, { color: c.inkMuted }]}>{doneCount}/{tasks.length}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.hairline }]}>
        {tasks.map((task, i) => {
          const done = task.status === 'done';
          return (
            <Pressable
              key={task.id}
              accessibilityLabel={`${task.title}, ${done ? 'đã xong' : 'đã bỏ qua'}. Chạm để sửa.`}
              onPress={() => onOpen(task.id)}
              style={({ pressed }) => [
                styles.row,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.hairline },
                pressed && { backgroundColor: c.bg },
              ]}
            >
              <View style={[styles.mark, { borderColor: done ? c.accent : c.inkMuted }]}>
                {done ? (
                  <CompletionCheck color={c.accent} size={16} />
                ) : (
                  <Text style={[styles.markGlyph, { color: c.inkMuted }]}>×</Text>
                )}
              </View>

              <Text style={[type.body, styles.title, { color: c.inkMuted }]} numberOfLines={1}>
                {task.title}
              </Text>

              {task.tag ? (
                <View style={[styles.tagDot, { backgroundColor: tagColor(task.tag) }]} />
              ) : null}
              {task.fixedStart ? (
                <Text style={[type.time, { color: c.inkMuted }]}>{task.fixedStart}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: space.m, paddingTop: space.l, gap: space.s },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: space.xs },
  card: { borderRadius: radii.m, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s, paddingHorizontal: space.m, minHeight: 48 },
  mark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markGlyph: { fontSize: 12, fontWeight: '700', lineHeight: 14 },
  title: { flex: 1, textDecorationLine: 'line-through' },
  tagDot: { width: 8, height: 8, borderRadius: 4 },
});
