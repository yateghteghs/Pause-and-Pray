import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as AppGate from '../../modules/app-gate';
import { Body, Button, Card, Label, Screen } from '../components/ui';
import { colors, space } from '../components/theme';
import { setGatedApps, useAppState } from '../state/store';
import { DEMO_APPS, IS_WEB_PREVIEW } from '../features/demo';

/** Shown first when installed, because they are what most users want to pause. */
const SUGGESTED = [
  'com.instagram.android',
  'com.zhiliaoapp.musically', // TikTok
  'com.ss.android.ugc.trill', // TikTok (some regions)
  'com.whatsapp',
  'com.google.android.youtube',
  'com.facebook.katana',
  'com.twitter.android', // X
  'com.snapchat.android',
  'com.facebook.lite',
];

export default function Apps() {
  return Platform.OS === 'ios' ? <IosApps /> : <AndroidApps />;
}

function AndroidApps() {
  const state = useAppState();
  const [apps, setApps] = useState<AppGate.InstalledApp[] | null>(null);
  const [query, setQuery] = useState('');
  const selected = new Set(state.gate.gatedApps);

  useEffect(() => {
    if (IS_WEB_PREVIEW) setApps(DEMO_APPS);
    else AppGate.getInstalledApps().then(setApps).catch(() => setApps([]));
  }, []);

  const sorted = useMemo(() => {
    if (!apps) return [];
    const q = query.trim().toLowerCase();
    const filtered = apps.filter((a) => !q || a.label.toLowerCase().includes(q));
    const rank = (a: AppGate.InstalledApp) => {
      const i = SUGGESTED.indexOf(a.packageName);
      return i === -1 ? 100 : i;
    };
    return filtered.sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label));
  }, [apps, query]);

  function toggle(app: AppGate.InstalledApp) {
    const next = new Set(selected);
    if (next.has(app.packageName)) next.delete(app.packageName);
    else next.add(app.packageName);
    setGatedApps([...next], { [app.packageName]: app.label });
  }

  if (!AppGate.isNativeGateAvailable && !IS_WEB_PREVIEW) {
    return (
      <Screen>
        <Card>
          <Body>
            The app list needs the native Pause & Pray build. In Expo Go or on the web there is nothing to pause, but you
            can still try the Prayer Pause screen from Today.
          </Body>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <TextInput placeholder="Search apps" value={query} onChangeText={setQuery} style={s.search} placeholderTextColor={colors.muted} />
      {IS_WEB_PREVIEW ? <Body muted>Preview: sample apps stand in for the ones installed on your phone.</Body> : null}
      <Label>{selected.size} chosen</Label>
      {apps == null ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <Card style={{ paddingVertical: space.xs }}>
          {sorted.map((a) => {
            const on = selected.has(a.packageName);
            return (
              <Pressable key={a.packageName} onPress={() => toggle(a)} style={s.row} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                <View style={[s.box, on && s.boxOn]}>{on ? <Text style={s.tick}>✓</Text> : null}</View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>{a.label}</Text>
                  {SUGGESTED.includes(a.packageName) ? <Text style={s.hint}>Suggested</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}

function IosApps() {
  const [count, setCount] = useState(AppGate.iosSelectionCount());
  return (
    <Screen>
      <Card>
        <Body>
          Apple's picker opens next. Choose apps such as Instagram, TikTok, WhatsApp and YouTube, or a whole category
          like Social. Apple keeps the list private, even from us.
        </Body>
        <Button
          title={count ? `${count} chosen, change` : 'Choose apps'}
          onPress={async () => {
            const n = await AppGate.presentAppPicker();
            setCount(n);
            // On iOS the real list lives in the App Group; the store only needs to know one exists.
            setGatedApps(n > 0 ? ['ios-selection'] : []);
          }}
        />
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  search: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.line, padding: 12, fontSize: 16, color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 12 },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tick: { color: '#fff', fontWeight: '800' },
  label: { fontSize: 16, color: colors.ink },
  hint: { fontSize: 12, color: colors.gold },
});
