import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, space } from './theme';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      {scroll ? <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView> : <View style={[styles.content, { flex: 1 }]}>{children}</View>}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function H1({ children }: { children: ReactNode }) {
  return <Text style={styles.h1}>{children}</Text>;
}

export function H2({ children }: { children: ReactNode }) {
  return <Text style={styles.h2}>{children}</Text>;
}

export function Body({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: object }) {
  return <Text style={[styles.body, muted && { color: colors.muted }, style]}>{children}</Text>;
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

type ButtonKind = 'primary' | 'secondary' | 'ghost';

export function Button({
  title,
  onPress,
  kind = 'primary',
  disabled,
}: {
  title: string;
  onPress: () => void;
  kind?: ButtonKind;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        kind === 'primary' && { backgroundColor: colors.primary },
        kind === 'secondary' && { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.primary },
        kind === 'ghost' && { backgroundColor: 'transparent' },
        (pressed || disabled) && { opacity: disabled ? 0.4 : 0.75 },
      ]}
    >
      <Text style={[styles.buttonText, kind !== 'primary' && { color: colors.primary }]}>{title}</Text>
    </Pressable>
  );
}

export function SwitchRow({ label, detail, value, onChange }: { label: string; detail?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, paddingRight: space.md }}>
        <Text style={styles.body}>{label}</Text>
        {detail ? <Text style={[styles.small, { color: colors.muted }]}>{detail}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary, false: colors.line }} />
    </View>
  );
}

export function NavRow({ label, detail, onPress }: { label: string; detail?: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.body}>{label}</Text>
        {detail ? <Text style={[styles.small, { color: colors.muted }]}>{detail}</Text> : null}
      </View>
      <Text style={{ color: colors.muted, fontSize: 20 }}>›</Text>
    </Pressable>
  );
}

export function Segmented<T extends string | number>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={String(o.value)} onPress={() => onChange(o.value)} style={[styles.segment, active && { backgroundColor: colors.primary }]}>
            <Text style={[styles.small, { color: active ? colors.primaryInk : colors.ink, fontWeight: '600' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.md, gap: space.md },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: space.md, gap: space.sm, borderWidth: 1, borderColor: colors.line },
  h1: { fontSize: 26, fontWeight: '700', color: colors.ink },
  h2: { fontSize: 19, fontWeight: '700', color: colors.ink },
  body: { fontSize: 16, lineHeight: 23, color: colors.ink },
  small: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: colors.muted },
  button: { borderRadius: radius, paddingVertical: 14, paddingHorizontal: space.md, alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '700', color: colors.primaryInk, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.sm, minHeight: 48 },
  segmented: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: radius, padding: 3, borderWidth: 1, borderColor: colors.line },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radius - 3 },
});
