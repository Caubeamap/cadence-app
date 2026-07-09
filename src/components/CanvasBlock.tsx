import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Task } from '../core/types';
import { PositionedBlock } from '../core/scheduler/layoutDay';
import { formatDuration } from '../core/daySummary';
import { deadlineStatus } from '../core/deadlineStatus';
import { tagColor } from '../core/tagColor';
import { useTheme } from '../theme/useTheme';
import { radii, space, type } from '../theme/tokens';
import { PulseDot } from './PulseDot';

interface Props {
  positioned: PositionedBlock;
  task: Task;
  index: number;
  isCurrent: boolean;
  nowMin: number;
  isToday: boolean;
  onOpen: (id: string) => void;
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

export const CanvasBlock = memo(function CanvasBlock({
  positioned, task, index, isCurrent, nowMin, isToday, onOpen, onDone, onSkip,
}: Props) {
  const c = useTheme();
  const { block, top, height, lane, lanes } = positioned;
  // The canvas only renders pending tasks; finished ones live in FinishedList.
  const compact = height < 56;
  const barColor = task.tag ? tagColor(task.tag) : c.hairline;
  const dl = task.deadline && isToday ? deadlineStatus(task.deadline, nowMin) : null;
  const dlColor = dl?.level === 'late' ? c.danger : dl?.level === 'soon' ? c.accent : c.inkMuted;

  const meta: string[] = [formatDuration(task.durationMin)];
  if (task.tag) meta.push(`#${task.tag}`);
  if (task.kind === 'fixed') meta.push('cố định');
  if (task.priority === 'high') meta.push('ưu tiên');

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 8) * 30).springify().damping(18)}
      exiting={FadeOut.duration(180)}
      style={{
        position: 'absolute',
        top,
        height,
        left: `${(lane / lanes) * 100}%`,
        width: `${100 / lanes}%`,
        paddingRight: lanes > 1 && lane < lanes - 1 ? space.xs : 0,
      }}
    >
      <ReanimatedSwipeable
        dragOffsetFromLeftEdge={24}
        dragOffsetFromRightEdge={24}
        renderLeftActions={() => <ActionPane label="Xong" color={c.accent} />}
        renderRightActions={() => <ActionPane label="Bỏ qua" color={c.inkMuted} />}
        onSwipeableOpen={(direction) => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          if (direction === 'left') onDone(task.id);
          else onSkip(task.id);
        }}
        containerStyle={styles.swipeContainer}
      >
        <Pressable
          onPress={() => onOpen(task.id)}
          style={[
            styles.card,
            {
              backgroundColor: isCurrent ? c.accentSoft : c.surface,
              borderColor: isCurrent ? c.accent : c.hairline,
              borderLeftColor: barColor,
            },
            compact && styles.cardCompact,
          ]}
          accessibilityLabel={`${task.title}, từ ${block.start} đến ${block.end}. Chạm để sửa.`}
        >
          <View style={styles.titleRow}>
            {isCurrent ? <PulseDot color={c.accent} /> : null}
            <Text
              style={[
                compact ? type.body : type.section,
                { color: c.ink, flexShrink: 1 },
              ]}
              numberOfLines={compact ? 1 : 2}
            >
              {task.title}
            </Text>
          </View>
          {!compact ? (
            <View style={styles.metaRow}>
              <Text style={[type.caption, { color: c.inkMuted }]}>{meta.join(' · ')}</Text>
              {dl ? <Text style={[type.caption, { color: dlColor }]}> · {dl.text}</Text> : null}
              {!dl && task.deadline ? (
                <Text style={[type.caption, { color: block.overflowed ? c.danger : c.inkMuted }]}>
                  {block.overflowed ? ` · không kịp hạn ${task.deadline}` : ` · hạn ${task.deadline}`}
                </Text>
              ) : null}
            </View>
          ) : null}
        </Pressable>
      </ReanimatedSwipeable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  swipeContainer: { flex: 1 },
  card: {
    flex: 1,
    gap: 2,
    paddingHorizontal: space.m,
    paddingVertical: space.s,
    borderRadius: radii.s,
    borderWidth: 1,
    borderLeftWidth: 3,
    overflow: 'hidden',
  },
  cardCompact: { justifyContent: 'center', paddingVertical: space.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap' },
  action: { flex: 1, justifyContent: 'center', paddingHorizontal: space.l, borderRadius: radii.s },
  actionLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
