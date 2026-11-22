import { useCallback, useState } from 'react';
import { AppState as RNAppState, Platform, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as AppGate from '../../modules/app-gate';
import { Body, Button, Card, H1, Label, Screen } from '../components/ui';
import { colors, space } from '../components/theme';
import { completeOnboarding, useAppState } from '../state/store';
import { ensurePermission, scheduleReminders } from '../features/reminders';
import { IS_WEB_PREVIEW } from '../features/demo';

type Step = 'welcome' | 'how' | 'permission' | 'apps' | 'reminders';
const STEPS: Step[] = ['welcome', 'how', 'permission', 'apps', 'reminders'];

export default function Onboarding() {
  const [step, setStep] = useState<Step>('welcome');
  const state = useAppState();
  const [, refresh] = useState(0);
  const next = () => setStep(STEPS[STEPS.indexOf(step) + 1]);

  // Re-check permissions when the user returns from system settings.
  useFocusEffect(
    useCallback(() => {
      const sub = RNAppState.addEventListener('change', (s) => s === 'active' && refresh((n) => n + 1));
      return () => sub.remove();
    }, []),
  );

  return (
    <Screen>
      <View style={{ height: space.xl }} />
      <Label>
        Step {STEPS.indexOf(step) + 1} of {STEPS.length}
      </Label>
      {step === 'welcome' && (
        <>
          <H1>Pause and pray before you scroll.</H1>
          <Body>
            Pause & Pray asks you to say a short Catholic prayer before Instagram, TikTok, WhatsApp, YouTube or any app
            you choose. Prayers, times and seasons follow the Church's calendar.
          </Body>
          <Button title="Begin" onPress={next} />
        </>
      )}

      {step === 'how' && (
        <>
          <H1>How it works</H1>
          <Card>
            <Body>1. You choose the apps to pause.</Body>
            <Body>2. When you open one, a prayer appears first.</Body>
            <Body>3. Tap “I've prayed” and the app opens for 15, 30 or 60 minutes. “Skip for now” is always there, and is counted honestly.</Body>
            <Body>4. Optional gates at the Angelus (6am, noon, 6pm) and the Hour of Mercy (3pm).</Body>
          </Card>
          <Card>
            <Label>Your privacy</Label>
            <Body>
              Everything stays on your phone. There is no account and no server copy of your prayer. Using a prayer app
              reveals your faith, and we treat that as sensitive data.
            </Body>
          </Card>
          <Button title="Continue" onPress={next} />
        </>
      )}

      {step === 'permission' &&
        (IS_WEB_PREVIEW ? (
          <AndroidPermission onDone={next} preview />
        ) : Platform.OS === 'android' ? (
          <AndroidPermission onDone={next} />
        ) : (
          <IosPermission onDone={next} />
        ))}

      {step === 'apps' && (
        <>
          <H1>Choose apps to pause</H1>
          <Body>Start with the one that takes most of your time. You can change this later in Settings.</Body>
          <Button kind="secondary" title={state.gate.gatedApps.length ? `${state.gate.gatedApps.length} chosen, change` : 'Choose apps'} onPress={() => router.push('/apps')} />
          <Button title="Continue" onPress={next} disabled={!state.gate.gatedApps.length && (AppGate.isNativeGateAvailable || IS_WEB_PREVIEW)} />
        </>
      )}

      {step === 'reminders' && (
        <>
          <H1>Prayer-time reminders</H1>
          <Body>
            We can remind you at the Angelus and the 3pm Hour of Mercy. You can change the times, or turn them off, in
            Settings.
          </Body>
          <Button
            title="Turn on reminders"
            onPress={async () => {
              await ensurePermission();
              completeOnboarding();
              await scheduleReminders(state.gate.schedule, true);
              router.replace('/');
            }}
          />
          <Button
            kind="ghost"
            title="Not now"
            onPress={() => {
              completeOnboarding();
              router.replace('/');
            }}
          />
        </>
      )}
    </Screen>
  );
}

/**
 * Prominent disclosure shown before the Accessibility permission, as Google
 * Play requires. Keep the wording in step with the Play Console declaration.
 */
function AndroidPermission({ onDone, preview }: { onDone: () => void; preview?: boolean }) {
  const [granted, setGranted] = useState({ a11y: false, overlay: false });
  const a11y = preview ? granted.a11y : AppGate.isAccessibilityServiceEnabled();
  const overlay = preview ? granted.overlay : AppGate.canDrawOverlays();
  const openA11y = preview ? () => setGranted((g) => ({ ...g, a11y: true })) : AppGate.openAccessibilitySettings;
  const openOverlay = preview ? () => setGranted((g) => ({ ...g, overlay: true })) : AppGate.openOverlaySettings;
  return (
    <>
      <H1>Two permissions</H1>
      <Card>
        <Label>1 · Accessibility service</Label>
        <Body>
          Pause & Pray uses Android's Accessibility Service only to see the <Text style={s.b}>name of the app</Text> that
          has just opened, so it can show a prayer before the apps you chose.
        </Body>
        <Body>
          It never reads what is on your screen, what you type, or your messages. Nothing is sent off your phone.
        </Body>
        <Button kind={a11y ? 'secondary' : 'primary'} title={a11y ? 'Turned on ✓' : 'Open Accessibility settings'} onPress={openA11y} />
        <Body muted>{preview ? 'Preview: on a phone this opens Android settings. ' : ''}In the list, tap “Pause & Pray”, then turn it on.</Body>
      </Card>
      <Card>
        <Label>2 · Display over other apps</Label>
        <Body>Lets the Prayer Pause screen appear in front of the app you opened.</Body>
        <Button kind={overlay ? 'secondary' : 'primary'} title={overlay ? 'Allowed ✓' : 'Allow'} onPress={openOverlay} />
      </Card>
      <Button title={a11y && overlay ? 'Continue' : 'I will do this later'} kind={a11y && overlay ? 'primary' : 'ghost'} onPress={onDone} />
    </>
  );
}

function IosPermission({ onDone }: { onDone: () => void }) {
  const [authorised, setAuthorised] = useState(AppGate.isScreenTimeAuthorized());
  return (
    <>
      <H1>Allow Screen Time</H1>
      <Card>
        <Body>
          Pause & Pray uses Apple's Screen Time to place a prayer screen over the apps you choose. Apple keeps your choice
          private: even we cannot see which apps you picked.
        </Body>
        <Button
          kind={authorised ? 'secondary' : 'primary'}
          title={authorised ? 'Allowed ✓' : 'Allow Screen Time'}
          onPress={async () => setAuthorised(await AppGate.requestScreenTimeAuthorization())}
        />
      </Card>
      <Button title={authorised ? 'Continue' : 'I will do this later'} kind={authorised ? 'primary' : 'ghost'} onPress={onDone} />
    </>
  );
}

const s = StyleSheet.create({ b: { fontWeight: '700', color: colors.ink } });
