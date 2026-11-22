import { useState } from 'react';
import { router } from 'expo-router';
import { Body, Button, H1, Screen } from '../../components/ui';
import { ErrorText, Field, Notice } from '../../components/form';
import { accountsConfigured } from '../../features/auth';
import { DEMO_CODE, joinGroup } from '../../features/groups';

export default function JoinGroup() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function join() {
    setBusy(true);
    setError(null);
    const r = await joinGroup(code);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    router.replace({ pathname: '/group/[id]', params: { id: r.value.id } });
  }

  return (
    <Screen>
      <H1>Join a group</H1>
      <Body>Ask your group leader for the 6-letter invite code.</Body>
      {!accountsConfigured ? <Notice>Preview: try the code {DEMO_CODE} to join a sample group.</Notice> : null}
      <Field id="code" label="Invite code" value={code} onChangeText={(t) => setCode(t.toUpperCase())} autoCapitalize="characters" maxLength={8} onSubmitEditing={join} />
      <Body muted>
        Members of the group will see your name and the days you pray. They will not see your intentions or anything
        else on your phone. You can leave at any time.
      </Body>
      <ErrorText>{error}</ErrorText>
      <Button title={busy ? 'Joining…' : 'Join group'} onPress={join} disabled={busy || !code.trim()} />
    </Screen>
  );
}
