import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Body, Card, Label, NavRow, Screen } from '../../components/ui';
import { colors, space } from '../../components/theme';
import { computeStats } from '../../core/stats';
import { useAppState } from '../../state/store';

export default function StatsScreen() {
  const { events, account, intentions } = useAppState();
  const s = computeStats(events, new Date());
  const rows: [string, string | number][] = [
    ['Current streak', `${s.currentStreak} ${s.currentStreak === 1 ? 'day' : 'days'}`],
    ['Longest streak', `${s.longestStreak} ${s.longestStreak === 1 ? 'day' : 'days'}`],
    ['Days with prayer', s.daysPrayed],
    ['Prayers said', s.prayersSaid],
    ['Minutes in prayer', s.minutesInPrayer],
    ['Times you put the phone down', s.timesPutDown],
    ['Skipped', s.skips],
  ];
  return (
    <Screen>
      <Card style={{ paddingVertical: space.xs }}>
        <NavRow
          label={account ? account.name || account.email : 'Account'}
          detail={account ? 'Account, apps to pause and prayer times' : 'Apps to pause, prayer times, sign in'}
          onPress={() => router.push('/settings')}
        />
        <NavRow label="My intentions" detail={intentions.length ? intentions.join(' · ') : 'Choose three'} onPress={() => router.push('/intentions')} />
        <NavRow label="Privacy and your data" onPress={() => router.push('/privacy')} />
      </Card>
      <Card>
        <Label>Prayed rather than skipped</Label>
        <Text style={st.big}>{s.prayedRate == null ? '–' : `${Math.round(s.prayedRate * 100)}%`}</Text>
        <Body muted>Skips are counted honestly. Every prayer counts.</Body>
      </Card>
      <Card>
        {rows.map(([k, v]) => (
          <View key={k} style={st.row}>
            <Body>{k}</Body>
            <Text style={st.value}>{v}</Text>
          </View>
        ))}
      </Card>
      <Body muted>Counted on your phone only. Nothing is sent anywhere.</Body>
    </Screen>
  );
}

const st = StyleSheet.create({
  big: { fontSize: 44, fontWeight: '700', color: colors.primary },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  value: { fontSize: 16, fontWeight: '700', color: colors.ink },
});
