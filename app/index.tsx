import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useDayStore } from '../src/stores/useDayStore';
import { useSettingsStore } from '../src/stores/useSettingsStore';
import { todayISO, addDaysISO } from '../src/core/date';
import { summarizeDay } from '../src/core/daySummary';
import { dayProgress } from '../src/core/dayProgress';
import { finishedTasks } from '../src/core/finishedTasks';
import { WeekStrip } from '../src/components/WeekStrip';
import { DayCanvas } from '../src/components/DayCanvas';
import { DayProgressRing } from '../src/components/DayProgressRing';
import { EmptyDay } from '../src/components/EmptyDay';
import { useTheme } from '../src/theme/useTheme';
import { radii, space, type } from '../src/theme/tokens';

function headerFor(selectedDate: string): { caption: string; title: string } {
  const [y, m, d] = selectedDate.split('-').map(Number);
  const caption = new Date(y, m - 1, d).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const today = todayISO();
  if (selectedDate === today) return { caption, title: 'Hôm nay' };
  if (selectedDate === addDaysISO(today, 1)) return { caption, title: 'Ngày mai' };
  return { caption, title: `Ngày ${d}/${m}` };
}

export default function TodayScreen() {
  const c = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    selectedDate, blocks, tasks, nowMin, weekCounts, carryover,
    tick, updateStatus, addFromText, selectDate, moveCarryoverToToday,
  } = useDayStore();
  const { dayStart, dayEnd } = useSettingsStore();

  useEffect(() => {
    const timer = setInterval(tick, 30_000);
    return () => clearInterval(timer);
  }, [tick]);

  const isToday = selectedDate === todayISO();
  const { caption, title } = headerFor(selectedDate);
  const summary = isToday ? summarizeDay(tasks, blocks, nowMin, { dayStart, dayEnd }) : null;
  const progress = dayProgress(tasks);
  const finished = finishedTasks(tasks);

  function pickExample(text: string) {
    addFromText(text);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  return (
    <View style={[styles.screen, { backgroundColor: c.bg, paddingTop: insets.top + space.m }]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={[type.caption, { color: c.inkMuted, textTransform: 'capitalize' }]}>{caption}</Text>
            <Text style={[type.display, { color: c.ink }]}>{title}</Text>
          </View>
          {progress.total > 0 ? (
            <DayProgressRing ratio={progress.ratio} done={progress.done} total={progress.total} />
          ) : null}
        </View>
        {summary ? <Text style={[type.caption, { color: c.inkMuted }]}>{summary}</Text> : null}
      </View>

      <WeekStrip selected={selectedDate} counts={weekCounts} onSelect={selectDate} />

      {carryover > 0 ? (
        <Pressable
          accessibilityLabel={`Chuyển ${carryover} việc chưa xong từ hôm trước sang hôm nay`}
          style={[styles.banner, { backgroundColor: c.accentSoft }]}
          onPress={() => {
            moveCarryoverToToday();
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }}
        >
          <Text style={[type.caption, { color: c.accent, flex: 1 }]}>
            Còn {carryover} việc chưa xong từ hôm trước
          </Text>
          <Text style={[type.caption, { color: c.accent, fontWeight: '600' }]}>Chuyển sang hôm nay</Text>
        </Pressable>
      ) : null}

      {tasks.length === 0 ? (
        <EmptyDay onPick={pickExample} />
      ) : (
        <DayCanvas
          blocks={blocks}
          tasks={tasks}
          finished={finished}
          nowMin={nowMin}
          isToday={isToday}
          dayStart={dayStart}
          dayEnd={dayEnd}
          onOpen={(id) => router.push(`/task/${id}`)}
          onDone={(id) => updateStatus(id, 'done')}
          onSkip={(id) => updateStatus(id, 'skipped')}
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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerText: { flex: 1, gap: 2 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s,
    marginHorizontal: space.m,
    marginBottom: space.s,
    paddingHorizontal: space.m,
    minHeight: 44,
    borderRadius: radii.s,
  },
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
