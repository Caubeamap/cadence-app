import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { ScheduledBlock, Task } from '../core/types';
import { layoutDay } from '../core/scheduler/layoutDay';
import { currentBlock } from '../core/selectors';
import { toMinutes, toHHMM } from '../core/time';
import { useTheme } from '../theme/useTheme';
import { space, type } from '../theme/tokens';
import { CanvasBlock } from './CanvasBlock';

const PX_PER_MIN = 1.6;
const MIN_BLOCK_H = 40;
const HOURS_COL = 50;
const CANVAS_PAD = 12;

interface Props {
  blocks: ScheduledBlock[];
  tasks: Task[];
  nowMin: number;
  isToday: boolean;
  dayStart: string;
  dayEnd: string;
  onDone: (id: string) => void;
  onSkip: (id: string) => void;
}

export function DayCanvas({ blocks, tasks, nowMin, isToday, dayStart, dayEnd, onDone, onSkip }: Props) {
  const c = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const startMin = toMinutes(dayStart);
  const endMin = toMinutes(dayEnd);
  const canvasHeight = (endMin - startMin) * PX_PER_MIN;

  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const positioned = useMemo(
    () => layoutDay(blocks, startMin, PX_PER_MIN, MIN_BLOCK_H),
    [blocks, startMin],
  );
  const hours = useMemo(() => {
    const out: number[] = [];
    for (let h = Math.ceil(startMin / 60); h * 60 <= endMin; h += 1) out.push(h);
    return out;
  }, [startMin, endMin]);

  useEffect(() => {
    if (isToday && nowMin > startMin) {
      scrollRef.current?.scrollTo({
        y: Math.max(0, CANVAS_PAD + (nowMin - startMin) * PX_PER_MIN - 120),
        animated: false,
      });
    }
    // chỉ auto-scroll lần đầu vào màn hình
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nowTop = CANVAS_PAD + (nowMin - startMin) * PX_PER_MIN;
  const showNowLine = isToday && nowMin >= startMin && nowMin <= endMin;

  return (
    <ScrollView ref={scrollRef} style={styles.scroll}>
      <View style={{ height: canvasHeight + CANVAS_PAD * 2 }}>
        {hours.map((h) => {
          const top = CANVAS_PAD + (h * 60 - startMin) * PX_PER_MIN;
          const isDayEnd = h * 60 === endMin;
          return (
            <View key={h} style={[styles.hourRow, { top }]} pointerEvents="none">
              <Text style={[type.time, { color: c.inkMuted, width: HOURS_COL - 8, textAlign: 'right' }]}>
                {String(h).padStart(2, '0')}:00
              </Text>
              <View
                style={[
                  styles.gridline,
                  { backgroundColor: isDayEnd ? c.inkMuted : c.hairline },
                  isDayEnd && styles.gridlineEnd,
                ]}
              />
            </View>
          );
        })}

        <View style={styles.blockArea}>
          {positioned.map((p) => {
            const task = taskById.get(p.block.taskId);
            if (!task) return null;
            const nowBlock = isToday ? currentBlock(blocks, nowMin) : undefined;
            return (
              <CanvasBlock
                key={p.block.taskId}
                positioned={p}
                task={task}
                isCurrent={nowBlock?.taskId === p.block.taskId && task.status === 'pending'}
                nowMin={nowMin}
                isToday={isToday}
                onDone={onDone}
                onSkip={onSkip}
              />
            );
          })}
        </View>

        {showNowLine ? (
          <View style={[styles.nowRow, { top: nowTop }]} pointerEvents="none">
            <Text style={[type.time, { color: c.accent, width: HOURS_COL - 8, textAlign: 'right' }]}>
              {toHHMM(nowMin)}
            </Text>
            <View style={[styles.nowLine, { backgroundColor: c.accent }]} />
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  hourRow: {
    position: 'absolute',
    left: 0,
    right: space.m,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s,
    transform: [{ translateY: -8 }],
  },
  gridline: { flex: 1, height: StyleSheet.hairlineWidth },
  gridlineEnd: { height: 1 },
  blockArea: {
    position: 'absolute',
    top: CANVAS_PAD,
    bottom: CANVAS_PAD,
    left: HOURS_COL + space.s,
    right: space.m,
  },
  nowRow: {
    position: 'absolute',
    left: 0,
    right: space.m,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s,
    transform: [{ translateY: -8 }],
  },
  nowLine: { flex: 1, height: 1.5, borderRadius: 1 },
});
