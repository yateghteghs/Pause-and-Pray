import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Body, Button, Card, H2, Label, Screen } from '../../components/ui';
import { colors, space } from '../../components/theme';
import { formatTime } from '../../core/schedule';
import { groupsAvailable, refreshGroups } from '../../features/groups';
import { useAppState } from '../../state/store';

export default function Groups() {
  const { account, groups, gate } = useAppState();
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refreshGroups().then((r) => setError(r.ok ? null : r.error));
    }, []),
  );

  if (!groupsAvailable) {
    return (
      <Screen>
        <H2>Pray together</H2>
        <Body>Prayer groups are coming soon. They will let your parish, youth group or family pray together.</Body>
      </Screen>
    );
  }

  if (!account) {
    return (
      <Screen>
        <H2>Pray together</H2>
        <Body>
          Start a group for your parish, youth group, school or family, or join one with an invite code. Members share a
          group intention and a prayer time, and see who has prayed today.
        </Body>
        <Body muted>Groups need an account, so your group knows who you are.</Body>
        <Button title="Create an account" onPress={() => router.push('/sign-up')} />
        <Button kind="secondary" title="Sign in" onPress={() => router.push('/sign-in')} />
      </Screen>
    );
  }

  return (
    <Screen>
      {groups.length ? (
        groups.map((g) => {
          const local = gate.schedule.find((t) => t.id === `group-${g.id}`);
          return (
            <Pressable key={g.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/group/[id]', params: { id: g.id } })}>
              <Card>
                <Text style={s.name}>{g.name}</Text>
                {g.intention ? <Body muted>Praying for: {g.intention}</Body> : null}
                <View style={s.row}>
                  <Text style={s.meta}>{local ? `Prays together at ${formatTime(local)}` : 'No shared prayer time'}</Text>
                  {g.role === 'admin' ? <Text style={s.badge}>Leader</Text> : null}
                </View>
              </Card>
            </Pressable>
          );
        })
      ) : (
        <Card>
          <Label>Pray together</Label>
          <Body>
            Start a group for your parish, youth group, school or family, or join one with an invite code. Members share a
            group intention and a prayer time, and see who has prayed today.
          </Body>
        </Card>
      )}
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <Button title="Join with a code" onPress={() => router.push('/group/join')} />
      <Button kind="secondary" title="Start a group" onPress={() => router.push('/group/new')} />
    </Screen>
  );
}

const s = StyleSheet.create({
  name: { fontSize: 19, fontWeight: '700', color: colors.ink },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  meta: { fontSize: 14, color: colors.gold, fontWeight: '600', flexShrink: 1 },
  badge: { fontSize: 12, fontWeight: '700', color: colors.primary, borderWidth: 1, borderColor: colors.primary, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
});
