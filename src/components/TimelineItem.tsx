import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import * as Haptics from 'expo-haptics';
import { ScheduledBlock, Task } from '../core/types';
import { formatDuration } from '../core/daySummary';
import { useTheme } from '../theme/useTheme';
import { radii, space, type } from '../theme/tokens';
import { PulseDot } from './PulseDot';

interface Props {
  block: ScheduledBlock;
  task: Task;
  isCurrent: boolean;
  onDone: (id: string) => void;
  onSkip: (id: string) => void;
}

function ActionPane({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.action, { backgroundColor: color }]}>
      <Text style={styles.actionLabel}>{label}</Text>
    </View>
  );
}

export const TimelineItem = memo(function TimelineItem({ block, task, isCurrent, onDone, onSkip }: Props) {
  const c = useTheme();
  const finished = task.status !== 'pending';

  const meta: string[] = [formatDuration(task.durationMin)];
  if (task.kind === 'fixed') meta.push('giờ cố định');
  if (task.priority === 'high') meta.push('ưu tiên');

  const dot = isCurrent ? (
    <PulseDot color={c.accent} />
  ) : (
    <View
      style={[
        styles.dot,
        finished
          ? { backgroundColor: task.status === 'done' ? c.inkMuted : 'transparent', borderColor: c.inkMuted }
          : { backgroundColor: 'transparent', borderColor: c.accent },
      ]}
    />
  );

  return (
    <ReanimatedSwipeable
      enabled={!finished}
      renderLeftActions={() => <ActionPane label="Xong" color={c.accent} />}
      renderRightActions={() => <ActionPane label="Bỏ qua" color={c.inkMuted} />}
      onSwipeableOpen={(direction) => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (direction === 'left') onDone(task.id);
        else onSkip(task.id);
      }}
    >
      <View style={[styles.row, { backgroundColor: c.bg }]}>
        <View style={styles.timeCol}>
          <Text style={[type.time, { color: finished ? c.inkMuted : c.ink }]}>{block.start}</Text>
        </View>

        <View style={styles.railCol}>
          <View style={[styles.railLine, { backgroundColor: c.hairline }]} />
          {dot}
        </View>

        {finished ? (
          <View style={styles.compactBody}>
            <Text style={[type.body, { color: c.inkMuted }, styles.strike]} numberOfLines={1}>
              {task.title}
            </Text>
            <Text style={[type.caption, { color: c.inkMuted }]}>
              {task.status === 'done' ? 'xong' : 'bỏ qua'}
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.card,
              { backgroundColor: c.surface, borderColor: isCurrent ? c.accent : c.hairline },
              isCurrent && { backgroundColor: c.accentSoft },
            ]}
            accessibilityLabel={`${task.title}, từ ${block.start} đến ${block.end}`}
          >
            <Text style={[type.section, { color: c.ink }]} numberOfLines={2}>
              {task.title}
            </Text>
            <View style={styles.metaRow}>
              <Text style={[type.caption, { color: c.inkMuted }]}>{meta.join(' · ')}</Text>
              {task.deadline ? (
                <Text style={[type.caption, { color: block.overflowed ? c.danger : c.inkMuted }]}>
                  {block.overflowed ? ` · không kịp hạn ${task.deadline}` : ` · hạn ${task.deadline}`}
                </Text>
              ) : null}
            </View>
          </View>
        )}
      </View>
    </ReanimatedSwipeable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: space.l,
    paddingVertical: space.xs,
  },
  timeCol: { width: 44, alignItems: 'flex-end', paddingTop: space.m, paddingRight: space.s },
  railCol: { width: 26, alignItems: 'center', paddingTop: space.m + 2 },
  railLine: { position: 'absolute', top: 0, bottom: 0, width: 1 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  card: {
    flex: 1,
    gap: space.xs,
    padding: space.m,
    borderRadius: radii.m,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  compactBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.s,
    paddingVertical: space.s + 2,
    paddingHorizontal: space.xs,
  },
  strike: { textDecorationLine: 'line-through', flex: 1 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap' },
  action: { justifyContent: 'center', paddingHorizontal: space.l },
  actionLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
