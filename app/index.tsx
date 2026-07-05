import { useEffect, useMemo } from 'react';
import { ListRenderItemInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { useDayStore } from '../src/stores/useDayStore';
import { useSettingsStore } from '../src/stores/useSettingsStore';
import { toMinutes } from '../src/core/time';
import { summarizeDay } from '../src/core/daySummary';
import { buildTimeline, TimelineEntry } from '../src/core/timelineGaps';
import { TimelineItem } from '../src/components/TimelineItem';
import { GapRow } from '../src/components/GapRow';
import { NowDivider } from '../src/components/NowDivider';
import { EmptyDay } from '../src/components/EmptyDay';
import { useTheme } from '../src/theme/useTheme';
import { radii, space, type } from '../src/theme/tokens';

function formatToday(): string {
  return new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function TodayScreen() {
  const c = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const { blocks, tasks, nowMin, tick, updateStatus, addFromText } = useDayStore();
  const { dayStart, dayEnd } = useSettingsStore();

  useEffect(() => {
    const timer = setInterval(tick, 30_000);
    return () => clearInterval(timer);
  }, [tick]);

  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const entries = useMemo(() => buildTimeline(blocks), [blocks]);
  const summary = summarizeDay(tasks, blocks, nowMin, { dayStart, dayEnd });
  const nowEntryIndex = entries.findIndex(
    (e) => e.kind === 'block' && toMinutes(e.block.end) > nowMin,
  );

  function pickExample(text: string) {
    addFromText(text);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  return (
    <View style={[styles.screen, { backgroundColor: c.bg, paddingTop: insets.top + space.m }]}>
      <View style={styles.header}>
        <Text style={[type.caption, { color: c.inkMuted, textTransform: 'capitalize' }]}>{formatToday()}</Text>
        <Text style={[type.display, { color: c.ink }]}>Hôm nay</Text>
        {summary ? <Text style={[type.caption, { color: c.inkMuted }]}>{summary}</Text> : null}
      </View>

      {entries.length === 0 ? (
        <EmptyDay onPick={pickExample} />
      ) : (
        <Animated.FlatList
          data={entries}
          keyExtractor={(entry: TimelineEntry, index: number) =>
            entry.kind === 'block' ? entry.block.taskId : `gap-${index}`
          }
          itemLayoutAnimation={reduceMotion ? undefined : LinearTransition.springify().damping(18)}
          renderItem={({ item, index }: ListRenderItemInfo<TimelineEntry>) => {
            if (item.kind === 'gap') return <GapRow minutes={item.minutes} />;
            const task = taskById.get(item.block.taskId);
            if (!task) return null;
            const row = (
              <TimelineItem
                block={item.block}
                task={task}
                isCurrent={
                  toMinutes(item.block.start) <= nowMin &&
                  nowMin < toMinutes(item.block.end) &&
                  task.status === 'pending'
                }
                onDone={(id) => updateStatus(id, 'done')}
                onSkip={(id) => updateStatus(id, 'skipped')}
              />
            );
            return (
              <Animated.View entering={reduceMotion ? undefined : FadeInDown.springify().damping(18)}>
                {index === nowEntryIndex ? <NowDivider nowMin={nowMin} /> : null}
                {row}
              </Animated.View>
            );
          }}
          ListFooterComponent={
            nowEntryIndex === -1 && entries.length > 0 ? <NowDivider nowMin={nowMin} /> : null
          }
          contentContainerStyle={{ paddingVertical: space.s }}
        />
      )}

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.m, borderTopColor: c.hairline }]}>
        <Pressable
          accessibilityLabel="Thêm việc mới"
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: c.accent },
            pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
          ]}
          onPress={() => router.push('/add')}
        >
          <Text style={styles.addLabel}>Thêm việc</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Mở cài đặt"
          style={({ pressed }) => [
            styles.settingsButton,
            { borderColor: c.hairline },
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
          onPress={() => router.push('/settings')}
        >
          <Text style={[type.body, { color: c.inkMuted }]}>Cài đặt</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: space.l, paddingBottom: space.m, gap: space.xs },
  footer: {
    flexDirection: 'row',
    gap: space.s,
    paddingHorizontal: space.l,
    paddingTop: space.m,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  addButton: { flex: 1, minHeight: 52, borderRadius: radii.m, alignItems: 'center', justifyContent: 'center' },
  addLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  settingsButton: {
    minHeight: 52,
    paddingHorizontal: space.l,
    borderRadius: radii.m,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
