import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { parseTask } from '../src/core/parser/parseTask';
import { useDayStore } from '../src/stores/useDayStore';
import { ParsedPreview } from '../src/components/ParsedPreview';
import { useTheme } from '../src/theme/useTheme';
import { radii, space, type } from '../src/theme/tokens';

export default function AddTaskScreen() {
  const c = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const addFromText = useDayStore((s) => s.addFromText);
  const [text, setText] = useState('');
  const parsed = useMemo(() => (text.trim() ? parseTask(text) : null), [text]);

  function submit() {
    if (!text.trim()) return;
    addFromText(text);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: c.bg, paddingTop: space.l }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Text style={[type.display, { color: c.ink }]}>Thêm việc</Text>
        <TextInput
          autoFocus
          value={text}
          onChangeText={setText}
          onSubmitEditing={submit}
          returnKeyType="done"
          placeholder="Ví dụ: họp nhóm lúc 3h chiều 1 tiếng"
          placeholderTextColor={c.inkMuted}
          style={[styles.input, { borderColor: c.hairline, color: c.ink, backgroundColor: c.surface }]}
          accessibilityLabel="Nhập việc cần làm"
        />
        {parsed ? (
          <ParsedPreview parsed={parsed} />
        ) : (
          <Text style={[type.caption, { color: c.inkMuted }]}>
            Cứ viết tự nhiên: "nộp báo cáo trước 5h chiều", "tập gym 45 phút"...
          </Text>
        )}
      </View>
      <View style={{ padding: space.l, paddingBottom: insets.bottom + space.m }}>
        <Pressable
          accessibilityLabel="Xếp việc này vào lịch"
          style={[styles.submit, { backgroundColor: text.trim() ? c.accent : c.hairline }]}
          onPress={submit}
          disabled={!text.trim()}
        >
          <Text style={styles.submitLabel}>Xếp vào lịch</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, paddingHorizontal: space.l, gap: space.m },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: radii.m,
    paddingHorizontal: space.m,
    fontSize: 16,
  },
  submit: { minHeight: 52, borderRadius: radii.m, alignItems: 'center', justifyContent: 'center' },
  submitLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
