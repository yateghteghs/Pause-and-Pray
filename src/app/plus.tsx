import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Body, Button, Card, H1, Label, Screen } from '../components/ui';
import { ErrorText, Notice } from '../components/form';
import { colors, space } from '../components/theme';
import { FREE_FOREVER, hasPlus, PLUS_FEATURES } from '../core/plans';
import { billingPreview, buyPlus, getPlusOffers, MANAGE_SUBSCRIPTION_URL, PlusOffer, restorePlus } from '../features/billing';
import { useAppState } from '../state/store';

export default function Plus() {
  const { plus } = useAppState();
  const active = hasPlus(plus);
  const [offers, setOffers] = useState<PlusOffer[] | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPlusOffers().then((r) => {
      if (r.ok) {
        setOffers(r.offers);
        setChosen(r.offers[0]?.id ?? null);
      } else setError(r.error);
    });
  }, []);

  async function buy() {
    if (!chosen) return;
    setBusy(true);
    setError(null);
    const r = await buyPlus(chosen);
    setBusy(false);
    if (r.ok) router.back();
    else if (!r.cancelled) setError(r.error ?? 'The purchase did not complete.');
  }

  return (
    <Screen>
      <Label>Pause & Pray Plus</Label>
      <H1>{active ? 'You have Plus. Thank you.' : 'Pray more deeply'}</H1>
      {billingPreview ? <Notice>Preview: no store is connected, so nothing is charged.</Notice> : null}

      <Card>
        {PLUS_FEATURES.map((f) => (
          <View key={f.id} style={p.feature}>
            <Text style={p.featureTitle}>✦ {f.title}</Text>
            <Body muted>{f.detail}</Body>
          </View>
        ))}
      </Card>

      {active ? (
        <>
          {plus.until ? <Body muted>Renews or ends on {new Date(plus.until).toLocaleDateString()}.</Body> : null}
          {MANAGE_SUBSCRIPTION_URL ? (
            <Button kind="secondary" title="Manage subscription" onPress={() => Linking.openURL(MANAGE_SUBSCRIPTION_URL!)} />
          ) : null}
        </>
      ) : (
        <>
          {offers?.map((o) => (
            <Pressable
              key={o.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: chosen === o.id }}
              onPress={() => setChosen(o.id)}
              style={[p.offer, chosen === o.id && p.offerOn]}
            >
              <Text style={p.offerTitle}>{o.title}</Text>
              <Text style={p.offerPrice}>{o.price}</Text>
              {o.note ? <Text style={p.offerNote}>{o.note}</Text> : null}
            </Pressable>
          ))}
          <ErrorText>{error}</ErrorText>
          {info ? <Notice>{info}</Notice> : null}
          <Button title={busy ? 'Opening the store…' : 'Get Plus'} onPress={buy} disabled={busy || !chosen} />
          <Button
            kind="ghost"
            title="Restore purchases"
            onPress={async () => {
              const r = await restorePlus();
              setInfo(r.ok ? (r.active ? 'Plus restored.' : 'No Plus subscription found for this store account.') : null);
              if (!r.ok) setError(r.error ?? null);
            }}
          />
          <Body muted>
            Billed by Google Play or the App Store. Renews automatically until you cancel in your store account.
          </Body>
        </>
      )}

      <Card>
        <Label>Always free</Label>
        {FREE_FOREVER.map((f) => (
          <Body key={f}>• {f}</Body>
        ))}
      </Card>
    </Screen>
  );
}

const p = StyleSheet.create({
  feature: { gap: 2, paddingVertical: space.xs },
  featureTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  offer: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: space.md, backgroundColor: colors.card, gap: 2 },
  offerOn: { borderColor: colors.primary, borderWidth: 2 },
  offerTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  offerPrice: { fontSize: 15, color: colors.primary, fontWeight: '600' },
  offerNote: { fontSize: 13, color: colors.muted },
});
