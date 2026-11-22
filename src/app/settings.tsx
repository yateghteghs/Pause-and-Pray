import { useState } from 'react';
import { Platform, Text } from 'react-native';
import { router } from 'expo-router';
import * as AppGate from '../../modules/app-gate';
import { Body, Button, Card, Label, NavRow, Screen, Segmented, SwitchRow } from '../components/ui';
import { colors, space } from '../components/theme';
import { PrayerTimesEditor } from '../components/PrayerTimesEditor';
import { COUNTRIES } from '../core/country';
import { scheduleReminders } from '../features/reminders';
import { accountsAvailable, deleteAccount, signOut } from '../features/auth';
import { refreshGroups } from '../features/groups';
import { plusAvailable } from '../features/billing';
import { ListenButton } from '../components/ListenButton';
import { prayerItem } from '../core/audio';
import {
  continueAsGuest,
  getState,
  setAccount,
  setCountry,
  setGateMode,
  setRemindersEnabled,
  setUnlockMinutes,
  setVoice,
  useAppState,
} from '../state/store';

function refreshReminders() {
  const s = getState();
  scheduleReminders(s.gate.schedule, s.remindersEnabled).catch(() => {});
}

export default function Settings() {
  const state = useAppState();
  const { gate } = state;

  return (
    <Screen>
      {accountsAvailable ? <AccountCard /> : null}

      <Card>
        <Label>Prayer times</Label>
        <Body muted>When a prayer time comes, your chosen apps stay paused until you tap “I’ve prayed”.</Body>
        <PrayerTimesEditor schedule={gate.schedule} onChange={refreshReminders} />
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
        <NavRow
          label="Apps to pause"
          detail={gate.gatedApps.length ? `${gate.gatedApps.length === 1 && Platform.OS === 'ios' ? 'Chosen' : gate.gatedApps.length + ' apps'}` : 'None yet'}
          onPress={() => router.push('/apps')}
        />
        {Platform.OS === 'android' && AppGate.isNativeGateAvailable && !AppGate.isAccessibilityServiceEnabled() ? (
          <NavRow label="Gate is off" detail="Turn on the Pause & Pray accessibility service" onPress={AppGate.openAccessibilitySettings} />
        ) : null}
        <NavRow
          label="My intentions"
          detail={state.intentions.length ? state.intentions.join(' · ') : 'Choose three'}
          onPress={() => router.push('/intentions')}
        />
      </Card>

      <Card>
        <Label>Also pause between prayer times</Label>
        <Segmented
          options={[
            { value: 'prayer-times', label: 'No' },
            { value: 'every-open', label: 'Every time I open an app' },
          ]}
          value={gate.mode}
          onChange={setGateMode}
        />
        <Body muted>
          {gate.mode === 'every-open'
            ? 'A short prayer also appears each time you open a chosen app. You can skip it, except at a prayer time.'
            : 'Your apps pause only at your prayer times.'}
        </Body>
        {gate.mode === 'every-open' ? (
          <>
            <Label>Between prayer times, open the app for</Label>
            <Segmented
              options={[
                { value: 15, label: '15 min' },
                { value: 30, label: '30 min' },
                { value: 60, label: '60 min' },
              ]}
              value={gate.unlockMinutes}
              onChange={setUnlockMinutes}
            />
          </>
        ) : null}
      </Card>

      {plusAvailable ? (
        <Card>
          <Label>Read aloud (Plus)</Label>
          <Segmented
            options={[
              { value: 'slower', label: 'Slower, for prayer' },
              { value: 'normal', label: 'Normal' },
            ]}
            value={state.voice.rate}
            onChange={(rate) => setVoice({ rate })}
          />
          <ListenButton label="Hear a sample" items={() => [prayerItem('glory-be')]} />
          <Body muted>
            Uses your phone’s voice in English. Recorded prayers replace it as they are added, and more languages will follow.
          </Body>
        </Card>
      ) : null}

      <Card>
        <Label>Church calendar</Label>
        <Segmented options={COUNTRIES.map((c) => ({ value: c.code, label: c.label }))} value={state.country} onChange={setCountry} />
        <Body muted>Adds a country’s own feasts and saints to the General Roman Calendar.</Body>
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
          await refreshGroups();
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
              await refreshGroups();
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
