import { useState } from 'react';
import { router } from 'expo-router';
import { Body, Button, H1, Screen } from '../components/ui';
import { Checkbox, ErrorText, Field, Notice } from '../components/form';
import { accountsConfigured, signUp } from '../features/auth';
import { getState, setAccount } from '../state/store';

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);

  async function submit() {
    if (!consent) {
      setError('Tick the box to agree to how your account details are kept.');
      return;
    }
    setBusy(true);
    setError(null);
    const result = await signUp(name, email, password);
    setBusy(false);
    if (!result.ok) return setError(result.error);
    if (result.needsEmailConfirmation) return setConfirmEmail(result.account.email);
    setAccount(result.account);
    router.replace(getState().onboarded ? '/' : '/onboarding');
  }

  if (confirmEmail) {
    return (
      <Screen>
        <H1>Check your email</H1>
        <Body>
          We sent a link to {confirmEmail}. Open it to confirm your account, then come back and sign in.
        </Body>
        <Button title="Go to sign in" onPress={() => router.replace('/sign-in')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <H1>Create your account</H1>
      {!accountsConfigured ? (
        <Notice>Preview: no server is connected, so this account stays on this device and no password is saved.</Notice>
      ) : null}
      <Field id="name" label="Your name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" autoCapitalize="words" />
      <Field id="email" label="Email" value={email} onChangeText={setEmail} autoComplete="email" textContentType="emailAddress" keyboardType="email-address" autoCapitalize="none" />
      <Field id="password" label="Password (at least 8 characters)" value={password} onChangeText={setPassword} secure autoComplete="new-password" textContentType="newPassword" autoCapitalize="none" />
      <Checkbox checked={consent} onChange={setConsent}>
        I agree that Pause & Pray keeps my name and email to run my account. My prayers, intentions and history stay
        on this phone.
      </Checkbox>
      <ErrorText>{error}</ErrorText>
      <Button title={busy ? 'Creating your account…' : 'Create account'} onPress={submit} disabled={busy} />
      <Button kind="ghost" title="I already have an account" onPress={() => router.replace('/sign-in')} />
    </Screen>
  );
}
