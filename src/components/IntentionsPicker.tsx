import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import intentions from '../content/intentions.json';
import { colors, space } from './theme';

const MAX = intentions.max;

/** Choose up to three intentions from suggestions, or write your own. */
export function IntentionsPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [custom, setCustom] = useState('');
  const options = [...intentions.suggestions, ...value.filter((v) => !intentions.suggestions.includes(v))];
  const full = value.length >= MAX;

  const toggle = (item: string) => {
    if (value.includes(item)) onChange(value.filter((v) => v !== item));
    else if (!full) onChange([...value, item]);
  };

  const addCustom = () => {
    const text = custom.trim();
    if (!text || full || value.includes(text)) return;
    onChange([...value, text]);
    setCustom('');
  };

  return (
    <View style={{ gap: space.md }}>
      <Text style={p.count}>
        {value.length} of {MAX} chosen{full ? '. Tap one to change it.' : ''}
      </Text>
      <View style={p.wrap}>
        {options.map((o) => {
          const on = value.includes(o);
          return (
            <Pressable
              key={o}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on, disabled: !on && full }}
              onPress={() => toggle(o)}
              style={[p.chip, on && p.chipOn, !on && full && { opacity: 0.45 }]}
            >
              <Text style={[p.chipText, on && { color: '#fff' }]}>
                {on ? '✓ ' : ''}
                {o}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={p.customRow}>
        <TextInput
          nativeID="custom-intention"
          accessibilityLabel="Write your own intention"
          placeholder="Or write your own"
          placeholderTextColor={colors.muted}
          value={custom}
          onChangeText={setCustom}
          onSubmitEditing={addCustom}
          maxLength={60}
          editable={!full}
          style={p.input}
        />
        <Pressable accessibilityRole="button" onPress={addCustom} disabled={full || !custom.trim()} style={[p.add, (full || !custom.trim()) && { opacity: 0.4 }]}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Add</Text>
        </Pressable>
      </View>
    </View>
  );
}

const p = StyleSheet.create({
  count: { fontSize: 13, fontWeight: '700', color: colors.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 15, color: colors.ink },
  customRow: { flexDirection: 'row', gap: space.sm },
  input: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.ink },
  add: { backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 18, justifyContent: 'center' },
});
