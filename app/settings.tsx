import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettingsStore } from '../src/stores/useSettingsStore';
import { useDayStore } from '../src/stores/useDayStore';
import { toHHMM, toMinutes } from '../src/core/time';
import { describeVietnameseVoice, speakVietnamese } from '../src/services/tts';
import { useTheme } from '../src/theme/useTheme';
import { radii, space, type } from '../src/theme/tokens';

const RATES = [0.8, 1.0, 1.2];
const STEP = 30;

export default function SettingsScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const settings = useSettingsStore();
  const [voiceInfo, setVoiceInfo] = useState<string | null>(null);

  function shiftDay(key: 'dayStart' | 'dayEnd', delta: number) {
    const start = toMinutes(settings.dayStart);
    const end = toMinutes(settings.dayEnd);
    const raw = (key === 'dayStart' ? start : end) + delta;
    const clamped =
      key === 'dayStart'
        ? Math.min(Math.max(raw, 0), end - STEP)
        : Math.min(Math.max(raw, start + STEP), 24 * 60 - STEP);
    settings.set(key, toHHMM(clamped));
    useDayStore.getState().load();
  }

  async function testVoice() {
    const name = await describeVietnameseVoice();
    setVoiceInfo(name ? `Giọng đang dùng: ${name}` : 'Máy chưa có giọng tiếng Việt — dùng giọng mặc định.');
    await speakVietnamese('Tới giờ nghỉ giải lao rồi. Xong việc này còn 2 việc nữa.', settings.speechRate);
  }

  function TimeRow({ label, value, onShift }: { label: string; value: string; onShift: (delta: number) => void }) {
    return (
      <View style={[styles.row, { borderBottomColor: c.hairline }]}>
        <Text style={[type.body, { color: c.ink, flex: 1 }]}>{label}</Text>
        <Pressable
          accessibilityLabel={`Giảm ${label} 30 phút`}
          style={[styles.stepBtn, { borderColor: c.hairline }]}
          onPress={() => onShift(-STEP)}
        >
          <Text style={[type.section, { color: c.accent }]}>−</Text>
        </Pressable>
        <Text style={[type.section, { color: c.ink, width: 64, textAlign: 'center' }]}>{value}</Text>
        <Pressable
          accessibilityLabel={`Tăng ${label} 30 phút`}
          style={[styles.stepBtn, { borderColor: c.hairline }]}
          onPress={() => onShift(STEP)}
        >
          <Text style={[type.section, { color: c.accent }]}>+</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: c.bg, paddingTop: space.l }]}>
      <View style={styles.content}>
        <Text style={[type.display, { color: c.ink }]}>Cài đặt</Text>

        <TimeRow label="Bắt đầu ngày" value={settings.dayStart} onShift={(d) => shiftDay('dayStart', d)} />
        <TimeRow label="Kết thúc ngày" value={settings.dayEnd} onShift={(d) => shiftDay('dayEnd', d)} />

        <View style={[styles.row, { borderBottomColor: c.hairline }]}>
          <Text style={[type.body, { color: c.ink, flex: 1 }]}>Đọc nhắc nhở bằng giọng nói</Text>
          <Switch
            accessibilityLabel="Bật tắt đọc nhắc nhở bằng giọng nói"
            value={settings.voiceEnabled}
            onValueChange={(v) => settings.set('voiceEnabled', v)}
            trackColor={{ true: c.accent }}
          />
        </View>

        <View style={[styles.row, { borderBottomColor: c.hairline }]}>
          <Text style={[type.body, { color: c.ink, flex: 1 }]}>Tốc độ đọc</Text>
          {RATES.map((r) => (
            <Pressable
              key={r}
              accessibilityLabel={`Tốc độ đọc ${r}`}
              style={[
                styles.rateBtn,
                { borderColor: c.hairline },
                settings.speechRate === r && { backgroundColor: c.accentSoft, borderColor: c.accent },
              ]}
              onPress={() => settings.set('speechRate', r)}
            >
              <Text style={[type.caption, { color: settings.speechRate === r ? c.accent : c.inkMuted }]}>
                {r === 1.0 ? 'Vừa' : r < 1 ? 'Chậm' : 'Nhanh'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          accessibilityLabel="Nghe thử giọng đọc"
          style={[styles.testBtn, { borderColor: c.hairline }]}
          onPress={testVoice}
        >
          <Text style={[type.body, { color: c.accent }]}>Nghe thử giọng đọc</Text>
        </Pressable>
        {voiceInfo ? <Text style={[type.caption, { color: c.inkMuted }]}>{voiceInfo}</Text> : null}
      </View>
      <View style={{ height: insets.bottom + space.m }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, paddingHorizontal: space.l, gap: space.m },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.s,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateBtn: {
    minHeight: 44,
    paddingHorizontal: space.m,
    borderRadius: radii.s,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testBtn: {
    minHeight: 52,
    borderRadius: radii.m,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
