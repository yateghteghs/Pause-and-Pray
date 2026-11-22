import { useCallback, useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Body, Button, Card, H1, Label, Screen, SwitchRow } from '../../components/ui';
import { ErrorText, Field } from '../../components/form';
import { TimeField } from '../../components/TimeField';
import { colors, space } from '../../components/theme';
import { GroupDetail } from '../../core/groups';
import { formatTime } from '../../core/schedule';
import { getGroup, leaveGroup, updateGroup } from '../../features/groups';
import { useAppState } from '../../state/store';

export default function Group() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { gate } = useAppState();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const load = useCallback(() => {
    getGroup(id).then((r) => (r.ok ? setGroup(r.value) : setError(r.error)));
  }, [id]);
  useFocusEffect(load);

  if (!group) {
    return (
      <Screen>
        {error ? <ErrorText>{error}</ErrorText> : <Body muted>Loading…</Body>}
      </Screen>
    );
  }

  const local = gate.schedule.find((t) => t.id === `group-${group.id}`);
  const prayed = group.members.filter((m) => m.prayedToday).length;

  return (
    <Screen>
      <Stack.Screen options={{ title: group.name }} />
      <H1>{group.name}</H1>
      {group.intention ? (
        <Card>
          <Label>We are praying for</Label>
          <Body style={{ fontSize: 18 }}>{group.intention}</Body>
        </Card>
      ) : null}

      <Card>
        <Label>Today</Label>
        <Text style={s.big}>
          {prayed} of {group.members.length} prayed
        </Text>
        <Body muted>
          Group streak: {group.streak} {group.streak === 1 ? 'day' : 'days'} with someone praying
        </Body>
        {group.members.map((m) => (
          <View key={m.name + (m.isMe ? '-me' : '')} style={s.member}>
            <Text style={[s.tick, !m.prayedToday && { color: colors.line }]}>{m.prayedToday ? '✓' : '○'}</Text>
            <Text style={s.memberName}>
              {m.name}
              {m.isMe ? ' (you)' : ''}
            </Text>
          </View>
        ))}
        <Button
          title="Pray with the group"
          onPress={() => router.push({ pathname: '/pause', params: local ? { time: local.id } : { mode: 'now' } })}
        />
      </Card>

      <Card>
        <Label>Prayer time</Label>
        <Body>{local ? `Together at ${formatTime(local)} your time` : 'No shared prayer time yet.'}</Body>
        {local ? <Body muted>At this time your chosen apps pause until you pray. You can turn this off in Me, then Settings.</Body> : null}
      </Card>

      <Card>
        <Label>Invite code</Label>
        <Text selectable style={s.code}>
          {group.code}
        </Text>
        <Button
          kind="secondary"
          title="Share invite"
          onPress={() =>
            Share.share({ message: `Pray with ${group.name} on Pause & Pray. Join with the code ${group.code}.` }).catch(() => {})
          }
        />
      </Card>

      {group.role === 'admin' ? (
        editing ? (
          <EditGroup group={group} onDone={() => { setEditing(false); load(); }} />
        ) : (
          <Button kind="secondary" title="Change intention or prayer time" onPress={() => setEditing(true)} />
        )
      ) : null}

      {leaving ? (
        <Card>
          <Body>Leave {group.name}? Members will no longer see you.</Body>
          <Button
            title="Leave group"
            onPress={async () => {
              const r = await leaveGroup(group.id);
              if (!r.ok) return setError(r.error);
              router.back();
            }}
          />
          <Button kind="ghost" title="Stay" onPress={() => setLeaving(false)} />
        </Card>
      ) : (
        <Button kind="ghost" title="Leave group" onPress={() => setLeaving(true)} />
      )}
      <ErrorText>{error}</ErrorText>
    </Screen>
  );
}

function EditGroup({ group, onDone }: { group: GroupDetail; onDone: () => void }) {
  const { gate } = useAppState();
  const local = gate.schedule.find((t) => t.id === `group-${group.id}`);
  const [intention, setIntention] = useState(group.intention ?? '');
  const [withTime, setWithTime] = useState(Boolean(local));
  const [time, setTime] = useState({ hour: local?.hour ?? 20, minute: local?.minute ?? 0 });
  const [error, setError] = useState<string | null>(null);
  return (
    <Card>
      <Field id="edit-intention" label="Group intention" value={intention} onChangeText={setIntention} maxLength={140} />
      <SwitchRow label="Pray together at a set time" value={withTime} onChange={setWithTime} />
      {withTime ? <TimeField label="Group prayer time" hour={time.hour} minute={time.minute} onChange={(hour, minute) => setTime({ hour, minute })} /> : null}
      <ErrorText>{error}</ErrorText>
      <Button
        title="Save"
        onPress={async () => {
          const r = await updateGroup(group.id, { intention, hour: withTime ? time.hour : null, minute: withTime ? time.minute : null });
          if (!r.ok) return setError(r.error);
          onDone();
        }}
      />
      <Button kind="ghost" title="Cancel" onPress={onDone} />
    </Card>
  );
}

const s = StyleSheet.create({
  big: { fontSize: 28, fontWeight: '700', color: colors.primary },
  member: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 4 },
  tick: { width: 20, fontSize: 16, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  memberName: { fontSize: 16, color: colors.ink },
  code: { fontSize: 32, fontWeight: '800', letterSpacing: 6, color: colors.ink, fontVariant: ['tabular-nums'] },
});
