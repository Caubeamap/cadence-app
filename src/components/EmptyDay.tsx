import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { radii, space, type } from '../theme/tokens';

const EXAMPLES = [
  'họp nhóm lúc 3h chiều 1 tiếng',
  'tập gym 45 phút',
  'nộp báo cáo trước 5h chiều',
];

export function EmptyDay({ onPick }: { onPick: (text: string) => void }) {
  const c = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={[type.section, { color: c.ink }]}>Hôm nay chưa có gì.</Text>
      <Text style={[type.body, { color: c.inkMuted, textAlign: 'center' }]}>
        Gõ tự nhiên là Cadence tự xếp lịch. Chạm thử một ví dụ:
      </Text>
      <View style={styles.chips}>
        {EXAMPLES.map((text) => (
          <Pressable
            key={text}
            accessibilityLabel={`Thêm việc mẫu: ${text}`}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: c.accentSoft },
              pressed && { transform: [{ scale: 0.97 }] },
            ]}
            onPress={() => onPick(text)}
          >
            <Text style={[type.caption, { color: c.accent }]}>{text}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.m, padding: space.xl },
  chips: { gap: space.s, alignItems: 'center' },
  chip: { paddingHorizontal: space.m, paddingVertical: space.s + 2, borderRadius: radii.m },
});
