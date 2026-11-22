import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space } from './theme';

/** Hour and minute steppers (minutes in 5s). Works the same on Android, iOS and the web preview. */
export function TimeField({
  hour,
  minute,
  onChange,
  label,
}: {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
  label: string;
}) {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour < 12 ? 'am' : 'pm';
  const step = (dh: number, dm: number) => {
    const total = (((hour + dh) * 60 + minute + dm) % 1440 + 1440) % 1440;
    onChange(Math.floor(total / 60), total % 60);
  };
  return (
    <View style={t.row} accessibilityLabel={`${label}: ${h12}:${String(minute).padStart(2, '0')} ${suffix}`}>
      <Stepper label={`Earlier hour for ${label}`} text="−" onPress={() => step(-1, 0)} />
      <Text style={t.part}>{h12}</Text>
      <Stepper label={`Later hour for ${label}`} text="+" onPress={() => step(1, 0)} />
      <Text style={t.colon}>:</Text>
      <Stepper label={`5 minutes earlier for ${label}`} text="−" onPress={() => step(0, -5)} />
      <Text style={t.part}>{String(minute).padStart(2, '0')}</Text>
      <Stepper label={`5 minutes later for ${label}`} text="+" onPress={() => step(0, 5)} />
      <Pressable accessibilityRole="button" accessibilityLabel={`Switch ${label} to ${hour < 12 ? 'pm' : 'am'}`} onPress={() => step(12, 0)} style={t.ampm}>
        <Text style={t.ampmText}>{suffix}</Text>
      </Pressable>
    </View>
  );
}

function Stepper({ text, onPress, label }: { text: string; onPress: () => void; label: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [t.step, pressed && { opacity: 0.6 }]}>
      <Text style={t.stepText}>{text}</Text>
    </Pressable>
  );
}

const t = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  part: { minWidth: 30, textAlign: 'center', fontSize: 22, fontWeight: '700', color: colors.ink, fontVariant: ['tabular-nums'] },
  colon: { fontSize: 22, fontWeight: '700', color: colors.ink },
  step: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  stepText: { fontSize: 18, color: colors.primary, fontWeight: '700' },
  ampm: { marginLeft: space.xs, paddingHorizontal: 12, height: 34, borderRadius: radius, backgroundColor: colors.primary, justifyContent: 'center' },
  ampmText: { color: '#fff', fontWeight: '700' },
});
