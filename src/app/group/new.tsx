import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Body, Button, H1, Label, Screen, Segmented, SwitchRow } from '../../components/ui';
import { DEVOTION_LABELS, GroupDevotion } from '../../core/groups';
import { ErrorText, Field } from '../../components/form';
import { TimeField } from '../../components/TimeField';
import { createGroup } from '../../features/groups';

const DEVOTIONS = (Object.keys(DEVOTION_LABELS) as GroupDevotion[]).map((value) => ({
  value,
  label: { intentions: 'Intentions', angelus: 'Angelus', 'divine-mercy': 'Mercy', 'rosary-decade': 'Rosary' }[value],
}));

export default function NewGroup() {
  const { org } = useLocalSearchParams<{ org?: string }>();
  const [devotion, setDevotion] = useState<GroupDevotion>('intentions');
  const [name, setName] = useState('');
  const [intention, setIntention] = useState('');
  const [withTime, setWithTime] = useState(true);
  const [time, setTime] = useState({ hour: 20, minute: 0 });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    setError(null);
    const r = await createGroup({ name, intention, ...(withTime ? time : {}), ...(org ? { orgId: org, devotion } : {}) });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    router.replace({ pathname: '/group/[id]', params: { id: r.value.id } });
  }

  return (
    <Screen>
      <H1>Start a group</H1>
      <Field id="group-name" label="Group name" placeholder="St. Monica Youth Group" value={name} onChangeText={setName} maxLength={60} />
      <Field id="group-intention" label="What will the group pray for? (optional)" placeholder="Our families and our parish" value={intention} onChangeText={setIntention} maxLength={140} />
      {org ? (
        <>
          <Label>What the group prays together</Label>
          <Segmented options={DEVOTIONS} value={devotion} onChange={setDevotion} />
          <Body muted>{DEVOTION_LABELS[devotion]}, followed by the group intention.</Body>
        </>
      ) : null}
      <SwitchRow label="Pray together at a set time" detail="Members’ apps pause at this time until they pray" value={withTime} onChange={setWithTime} />
      {withTime ? (
        <>
          <Label>Group prayer time (your time zone)</Label>
          <TimeField label="Group prayer time" hour={time.hour} minute={time.minute} onChange={(hour, minute) => setTime({ hour, minute })} />
          <Body muted>Members in other time zones see it in their own local time.</Body>
        </>
      ) : null}
      <Body muted>You will get an invite code to share. Members see each other’s names and the days they pray.</Body>
      <ErrorText>{error}</ErrorText>
      <Button title={busy ? 'Creating…' : 'Create group'} onPress={create} disabled={busy || name.trim().length < 2} />
    </Screen>
  );
}
