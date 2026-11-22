import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, radius, space } from './theme';

export function Field({
  label,
  id,
  secure,
  ...input
}: TextInputProps & { label: string; id: string; secure?: boolean }) {
  const [hidden, setHidden] = useState(true);
  return (
    <View style={{ gap: 6 }}>
      <Text nativeID={`${id}-label`} style={f.label}>
        {label}
      </Text>
      <View style={f.box}>
        <TextInput
          nativeID={id}
          accessibilityLabelledBy={`${id}-label`}
          style={f.input}
          placeholderTextColor={colors.muted}
          secureTextEntry={secure && hidden}
          autoCorrect={false}
          {...input}
        />
        {secure ? (
          <Pressable accessibilityRole="button" onPress={() => setHidden((h) => !h)} style={f.toggle}>
            <Text style={f.toggleText}>{hidden ? 'Show' : 'Hide'}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}
    >
      <View style={[f.check, checked && f.checkOn]}>{checked ? <Text style={f.tick}>✓</Text> : null}</View>
      <Text style={f.checkText}>{children}</Text>
    </Pressable>
  );
}

export function ErrorText({ children }: { children?: string | null }) {
  if (!children) return null;
  return (
    <Text accessibilityRole="alert" style={f.error}>
      {children}
    </Text>
  );
}

export function Notice({ children }: { children: React.ReactNode }) {
  return <Text style={f.notice}>{children}</Text>;
}

const f = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', color: colors.ink },
  box: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius },
  input: { flex: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, color: colors.ink },
  toggle: { paddingHorizontal: 14, paddingVertical: 10 },
  toggleText: { color: colors.primary, fontWeight: '600' },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tick: { color: '#fff', fontWeight: '800', fontSize: 13 },
  checkText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.ink },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  notice: { color: colors.muted, fontSize: 13, lineHeight: 18, backgroundColor: '#EFEAD9', padding: space.sm, borderRadius: 10 },
});
