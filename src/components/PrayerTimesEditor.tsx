import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Body, Button, Label, SwitchRow } from './ui';
import { TimeField } from './TimeField';
import { colors, space } from './theme';
import { formatTime, PrayerTime } from '../core/schedule';
import { addPrayerTime, removePrayerTime, updatePrayerTime } from '../state/store';

const DEVOTION_NOTES: Record<string, string> = {
  'morning-offering': 'Offer the day to God',
  'angelus-6': 'Regina Caeli in Easter Time',
  'angelus-12': 'Regina Caeli in Easter Time',
  'angelus-18': 'Regina Caeli in Easter Time',
  'mercy-15': 'The hour Jesus died',
  'night-prayer': 'End the day with God',
};

/** Personal prayer times, then the optional devotions. Changes save straight away. */
export function PrayerTimesEditor({ schedule, onChange }: { schedule: PrayerTime[]; onChange?: () => void }) {
  const personal = schedule.filter((t) => t.kind === 'personal');
  const devotions = schedule.filter((t) => t.kind === 'devotion');
  const groups = schedule.filter((t) => t.kind === 'group');
  const changed = () => onChange?.();

  return (
    <View style={{ gap: space.md }}>
      <View style={{ gap: space.sm }}>
        <Label>My prayer times</Label>
        {personal.map((t, i) => (
          <View key={t.id} style={e.item}>
            <View style={e.itemHead}>
              <Text style={e.itemTitle}>Prayer time {personal.length > 1 ? i + 1 : ''}</Text>
              {personal.length > 1 ? (
                <Pressable accessibilityRole="button" onPress={() => { removePrayerTime(t.id); changed(); }}>
                  <Text style={e.remove}>Remove</Text>
                </Pressable>
              ) : null}
            </View>
            <TimeField label={`Prayer time ${i + 1}`} hour={t.hour} minute={t.minute} onChange={(hour, minute) => { updatePrayerTime(t.id, { hour, minute }); changed(); }} />
          </View>
        ))}
        {personal.length < 5 ? (
          <Button
            kind="secondary"
            title="Add another prayer time"
            onPress={() => {
              const last = personal[personal.length - 1];
              addPrayerTime(last ? (last.hour + 6) % 24 : 7, last?.minute ?? 0);
              changed();
            }}
          />
        ) : null}
      </View>

      <View style={{ gap: space.xs }}>
        <Label>Devotions (optional)</Label>
        <Body muted>When you switch one on, it pauses your apps at its time until you pray, like your own prayer times.</Body>
        {devotions.map((t) => (
          <View key={t.id}>
            <SwitchRow
              label={`${t.label} · ${formatTime(t)}`}
              detail={DEVOTION_NOTES[t.id]}
              value={t.enabled}
              onChange={(enabled) => { updatePrayerTime(t.id, { enabled }); changed(); }}
            />
            {t.enabled && !t.fixedTime ? (
              <TimeField label={t.label} hour={t.hour} minute={t.minute} onChange={(hour, minute) => { updatePrayerTime(t.id, { hour, minute }); changed(); }} />
            ) : null}
          </View>
        ))}
      </View>

      {groups.length ? (
        <View style={{ gap: space.xs }}>
          <Label>Group prayer times</Label>
          {groups.map((t) => (
            <SwitchRow
              key={t.id}
              label={`${t.label} · ${formatTime(t)}`}
              detail="Set by the group"
              value={t.enabled}
              onChange={(enabled) => { updatePrayerTime(t.id, { enabled }); changed(); }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const e = StyleSheet.create({
  item: { gap: space.sm, paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  itemHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemTitle: { fontSize: 16, fontWeight: '600', color: colors.ink },
  remove: { color: colors.danger, fontWeight: '600' },
});
