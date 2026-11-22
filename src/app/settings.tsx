import { Platform, View , Text } from 'react-native';
import { router } from 'expo-router';
import * as AppGate from '../../modules/app-gate';
import { Body, Button, Card, Label, NavRow, Screen, Segmented, SwitchRow } from '../components/ui';
import { space , colors } from '../components/theme';
import { formatTime, PrayerTime } from '../core/schedule';
import { scheduleReminders } from '../features/reminders';
import { useState } from 'react';
import { deleteAccount, signOut, accountsAvailable } from '../features/auth';
import { setAccount, continueAsGuest , getState, setGateMode, setRemindersEnabled, setUnlockMinutes, updatePrayerTime, useAppState } from '../state/store';

/** The Angelus and the Hour of Mercy keep their traditional times; others can move in 15-minute steps. */
const FIXED_TIMES = new Set(['angelus-6', 'angelus-12', 'mercy-15', 'angelus-18']);

function refreshReminders() {
  const s = getState();
  scheduleReminders(s.gate.schedule, s.remindersEnabled).catch(() => {});
}

export default function Settings() {
  const state = useAppState();
  const { gate } = state;

  const moveTime = (t: PrayerTime, delta: number) => {
    const total = (t.hour * 60 + t.minute + delta + 1440) % 1440;
    updatePrayerTime(t.id, { hour: Math.floor(total / 60), minute: total % 60 });
    refreshReminders();
  };

  return (
    <Screen>
      {accountsAvailable ? <AccountCard /> : null}

      <Card style={{ paddingVertical: space.xs }}>
        <NavRow
          label="My intentions"
          detail={state.intentions.length ? state.intentions.join(' · ') : 'Choose three'}
          onPress={() => router.push('/intentions')}
        />
      </Card>

      <Card style={{ paddingVertical: space.xs }}>
        <NavRow
          label="Apps to pause"
          detail={gate.gatedApps.length ? `${gate.gatedApps.length === 1 && Platform.OS === 'ios' ? 'Chosen' : gate.gatedApps.length + ' apps'}` : 'None yet'}
          onPress={() => router.push('/apps')}
        />
        {Platform.OS === 'android' && AppGate.isNativeGateAvailable && !AppGate.isAccessibilityServiceEnabled() ? (
          <NavRow label="Gate is off" detail="Turn on the Pause & Pray accessibility service" onPress={AppGate.openAccessibilitySettings} />
        ) : null}
      </Card>

      <Card>
        <Label>When to pause</Label>
        <Segmented
          options={[
            { value: 'every-open', label: 'Every open' },
            { value: 'prayer-times', label: 'Prayer times only' },
          ]}
          value={gate.mode}
          onChange={setGateMode}
        />
        <Body muted>
          {gate.mode === 'every-open'
            ? 'A prayer appears each time you open a chosen app, unless you prayed in the last few minutes.'
            : 'Chosen apps pause only during the prayer times switched on below.'}
        </Body>
      </Card>

      <Card>
        <Label>After praying, open the app for</Label>
        <Segmented
          options={[
            { value: 15, label: '15 min' },
            { value: 30, label: '30 min' },
            { value: 60, label: '60 min' },
          ]}
          value={gate.unlockMinutes}
          onChange={setUnlockMinutes}
        />
      </Card>

      <Card>
        <Label>Prayer times</Label>
        {gate.schedule.map((t) => (
          <View key={t.id}>
            <SwitchRow
              label={`${t.label} · ${formatTime(t)}`}
              detail={t.prayerId === 'angelus' ? 'Regina Caeli in Easter Time' : undefined}
              value={t.enabled}
              onChange={(enabled) => {
                updatePrayerTime(t.id, { enabled });
                refreshReminders();
              }}
            />
            {!FIXED_TIMES.has(t.id) && t.enabled ? (
              <View style={{ flexDirection: 'row', gap: space.sm, paddingBottom: space.sm }}>
                <View style={{ flex: 1 }}>
                  <Button kind="secondary" title="− 15 min" onPress={() => moveTime(t, -15)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button kind="secondary" title="+ 15 min" onPress={() => moveTime(t, 15)} />
                </View>
              </View>
            ) : null}
          </View>
        ))}
        <SwitchRow
          label="Reminders"
          detail="A notification at each prayer time"
          value={state.remindersEnabled}
          onChange={(v) => {
            setRemindersEnabled(v);
            refreshReminders();
          }}
        />
      </Card>

      <Card style={{ paddingVertical: space.xs }}>
        <NavRow label="Privacy and your data" onPress={() => router.push('/privacy')} />
      </Card>
    </Screen>
  );
}

function AccountCard() {
  const { account } = useAppState();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!account) {
    return (
      <Card style={{ paddingVertical: space.xs }}>
        <NavRow label="Create an account or sign in" detail="Optional. Your prayers stay on this phone." onPress={() => router.push('/welcome')} />
      </Card>
    );
  }
  return (
    <Card>
      <Label>Account</Label>
      <Body>{account.name || account.email}</Body>
      <Body muted>
        {account.email}
        {account.kind === 'preview' ? ' · preview account on this device' : ''}
      </Body>
      <Button
        kind="secondary"
        title="Sign out"
        onPress={async () => {
          await signOut();
          setAccount(null);
          continueAsGuest();
        }}
      />
      {confirming ? (
        <>
          <Body>Delete your account? Your name and email are removed from our server. Your prayer history on this phone is kept.</Body>
          {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
          <Button
            title="Yes, delete my account"
            onPress={async () => {
              const r = await deleteAccount();
              if (!r.ok) return setError(r.error ?? 'Could not delete the account. Try again.');
              setAccount(null);
              continueAsGuest();
              setConfirming(false);
            }}
          />
          <Button kind="ghost" title="Keep my account" onPress={() => setConfirming(false)} />
        </>
      ) : (
        <Button kind="ghost" title="Delete my account" onPress={() => setConfirming(true)} />
      )}
    </Card>
  );
}
