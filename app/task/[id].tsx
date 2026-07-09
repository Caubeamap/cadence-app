import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useDayStore } from '../../src/stores/useDayStore';
import { TaskKind, TaskStatus } from '../../src/core/types';
import { toHHMM, toMinutes } from '../../src/core/time';
import { useTheme } from '../../src/theme/useTheme';
import { radii, space, type } from '../../src/theme/tokens';

const DUR_STEP = 15;
const TIME_STEP = 15;

export default function EditTaskScreen() {
  const c = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const task = useDayStore((s) => s.tasks.find((t) => t.id === id));
  const editTask = useDayStore((s) => s.editTask);
  const updateStatus = useDayStore((s) => s.updateStatus);
  const remove = useDayStore((s) => s.remove);

  const [title, setTitle] = useState(task?.title ?? '');
  const [durationMin, setDurationMin] = useState(task?.durationMin ?? 30);
  const [kind, setKind] = useState<TaskKind>(task?.kind ?? 'flexible');
  const [fixedStart, setFixedStart] = useState(task?.fixedStart ?? '09:00');
  const [hasDeadline, setHasDeadline] = useState(Boolean(task?.deadline));
  const [deadline, setDeadline] = useState(task?.deadline ?? '17:00');
  const [priority, setPriority] = useState(task?.priority ?? 'normal');
  const [tag, setTag] = useState(task?.tag ?? '');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'pending');

  if (!task) {
    return (
      <View style={[styles.screen, { backgroundColor: c.bg }]}>
        <Text style={[type.body, { color: c.inkMuted, padding: space.l }]}>Không tìm thấy việc này.</Text>
      </View>
    );
  }

  function shiftTime(value: string, delta: number, setter: (v: string) => void) {
    const next = Math.min(Math.max(toMinutes(value) + delta, 0), 24 * 60 - TIME_STEP);
    setter(toHHMM(next));
  }

  function save() {
    if (!title.trim()) return;
    editTask(task!.id, {
      title: title.trim(),
      durationMin,
      kind,
      priority,
      ...(kind === 'fixed' ? { fixedStart } : {}),
      ...(kind === 'flexible' && hasDeadline ? { deadline } : {}),
      ...(tag.trim() ? { tag: tag.trim().toLowerCase() } : { tag: undefined }),
    });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  function del() {
    remove(task!.id);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.back();
  }

  function changeStatus(next: TaskStatus) {
    setStatus(next);
    updateStatus(task!.id, next);
    void Haptics.selectionAsync();
  }

  const Segmented = ({ options, value, onChange }: {
    options: { key: string; label: string }[];
    value: string;
    onChange: (k: string) => void;
  }) => (
    <View style={styles.segmented}>
      {options.map((o) => (
        <Pressable
          key={o.key}
          accessibilityLabel={o.label}
          style={[
            styles.segment,
            { borderColor: c.hairline },
            value === o.key && { backgroundColor: c.accentSoft, borderColor: c.accent },
          ]}
          onPress={() => onChange(o.key)}
        >
          <Text style={[type.body, { color: value === o.key ? c.accent : c.inkMuted }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );

  const Stepper = ({ label, value, onMinus, onPlus }: {
    label: string; value: string; onMinus: () => void; onPlus: () => void;
  }) => (
    <View style={styles.stepRow}>
      <Text style={[type.body, { color: c.ink, flex: 1 }]}>{label}</Text>
      <Pressable accessibilityLabel={`Giảm ${label}`} style={[styles.stepBtn, { borderColor: c.hairline }]} onPress={onMinus}>
        <Text style={[type.section, { color: c.accent }]}>−</Text>
      </Pressable>
      <Text style={[type.section, { color: c.ink, width: 72, textAlign: 'center' }]}>{value}</Text>
      <Pressable accessibilityLabel={`Tăng ${label}`} style={[styles.stepBtn, { borderColor: c.hairline }]} onPress={onPlus}>
        <Text style={[type.section, { color: c.accent }]}>+</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[type.display, { color: c.ink }]}>Sửa việc</Text>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Tên việc"
          placeholderTextColor={c.inkMuted}
          style={[styles.input, { borderColor: c.hairline, color: c.ink, backgroundColor: c.surface }]}
          accessibilityLabel="Tên việc"
        />

        <Segmented
          options={[
            { key: 'pending', label: 'Chưa làm' },
            { key: 'done', label: 'Xong' },
            { key: 'skipped', label: 'Bỏ qua' },
          ]}
          value={status}
          onChange={(k) => changeStatus(k as TaskStatus)}
        />

        <Stepper
          label="Thời lượng"
          value={`${durationMin} phút`}
          onMinus={() => setDurationMin(Math.max(DUR_STEP, durationMin - DUR_STEP))}
          onPlus={() => setDurationMin(durationMin + DUR_STEP)}
        />

        <Segmented
          options={[{ key: 'flexible', label: 'Linh hoạt' }, { key: 'fixed', label: 'Giờ cố định' }]}
          value={kind}
          onChange={(k) => setKind(k as TaskKind)}
        />

        {kind === 'fixed' ? (
          <Stepper
            label="Bắt đầu lúc"
            value={fixedStart}
            onMinus={() => shiftTime(fixedStart, -TIME_STEP, setFixedStart)}
            onPlus={() => shiftTime(fixedStart, TIME_STEP, setFixedStart)}
          />
        ) : (
          <>
            <View style={styles.stepRow}>
              <Text style={[type.body, { color: c.ink, flex: 1 }]}>Có hạn chót</Text>
              <Switch value={hasDeadline} onValueChange={setHasDeadline} trackColor={{ true: c.accent }} />
            </View>
            {hasDeadline ? (
              <Stepper
                label="Hạn chót"
                value={deadline}
                onMinus={() => shiftTime(deadline, -TIME_STEP, setDeadline)}
                onPlus={() => shiftTime(deadline, TIME_STEP, setDeadline)}
              />
            ) : null}
          </>
        )}

        <Segmented
          options={[{ key: 'normal', label: 'Bình thường' }, { key: 'high', label: 'Ưu tiên' }]}
          value={priority}
          onChange={(k) => setPriority(k as 'normal' | 'high')}
        />

        <TextInput
          value={tag}
          onChangeText={setTag}
          placeholder="Nhãn (ví dụ: học, cá nhân)"
          placeholderTextColor={c.inkMuted}
          autoCapitalize="none"
          style={[styles.input, { borderColor: c.hairline, color: c.ink, backgroundColor: c.surface }]}
          accessibilityLabel="Nhãn"
        />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.m, borderTopColor: c.hairline }]}>
        <Pressable
          accessibilityLabel="Xóa việc này"
          style={[styles.delBtn, { borderColor: c.danger }]}
          onPress={del}
        >
          <Text style={[type.body, { color: c.danger }]}>Xóa</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Lưu thay đổi"
          style={[styles.saveBtn, { backgroundColor: title.trim() ? c.accent : c.hairline }]}
          onPress={save}
          disabled={!title.trim()}
        >
          <Text style={styles.saveLabel}>Lưu</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: space.l, gap: space.m },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radii.m,
    paddingHorizontal: space.m,
    fontSize: 16,
  },
  segmented: { flexDirection: 'row', gap: space.s },
  segment: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.s,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: space.s, minHeight: 48 },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.s,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: space.s,
    paddingHorizontal: space.l,
    paddingTop: space.m,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  delBtn: {
    minHeight: 52,
    paddingHorizontal: space.l,
    borderRadius: radii.m,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: { flex: 1, minHeight: 52, borderRadius: radii.m, alignItems: 'center', justifyContent: 'center' },
  saveLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
