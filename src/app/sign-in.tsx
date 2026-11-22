import { useState } from 'react';
import { router } from 'expo-router';
import { Button, H1, Screen } from '../components/ui';
import { ErrorText, Field, Notice } from '../components/form';
import { accountsConfigured, sendPasswordReset, signIn } from '../features/auth';
import { getState, setAccount } from '../state/store';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    setInfo(null);
    const result = await signIn(email, password);
    setBusy(false);
    if (!result.ok) return setError(result.error);
    setAccount(result.account);
    router.replace(getState().onboarded ? '/' : '/onboarding');
  }

  async function forgot() {
    setError(null);
    const r = await sendPasswordReset(email);
    if (r.ok) setInfo(`If ${email.trim()} has an account, a link to reset the password is on its way.`);
    else setError(r.error ?? null);
  }

  return (
    <Screen>
      <H1>Welcome back</H1>
      {!accountsConfigured ? <Notice>Preview: no server is connected, so any email and password will sign you in on this device.</Notice> : null}
      <Field id="email" label="Email" value={email} onChangeText={setEmail} autoComplete="email" textContentType="emailAddress" keyboardType="email-address" autoCapitalize="none" />
      <Field id="password" label="Password" value={password} onChangeText={setPassword} secure autoComplete="current-password" textContentType="password" autoCapitalize="none" onSubmitEditing={submit} />
      <ErrorText>{error}</ErrorText>
      {info ? <Notice>{info}</Notice> : null}
      <Button title={busy ? 'Signing in…' : 'Sign in'} onPress={submit} disabled={busy} />
      <Button kind="ghost" title="Forgot your password?" onPress={forgot} />
      <Button kind="ghost" title="Create an account instead" onPress={() => router.replace('/sign-up')} />
    </Screen>
  );
}
