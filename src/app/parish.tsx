import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Body, Button, Card, H1, H2, Label, NavRow, Screen, Segmented } from '../components/ui';
import { ErrorText, Field, Notice } from '../components/form';
import { colors, space } from '../components/theme';
import { formatNaira, PARISH_TIERS, ParishTierId, tierById, tierLimitsText } from '../core/pricing';
import { Organization } from '../core/groups';
import { PARISH_FEATURES, parishActive } from '../core/plans';
import { accountsConfigured } from '../features/auth';
import { myOrganizations, requestParishPlan } from '../features/groups';
import { useAppState } from '../state/store';

const KINDS: { value: Organization['kind']; label: string }[] = [
  { value: 'parish', label: 'Parish' },
  { value: 'school', label: 'School' },
  { value: 'chaplaincy', label: 'Chaplaincy' },
  { value: 'association', label: 'Group' },
];

export default function Parish() {
  const { account } = useAppState();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [sent, setSent] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      myOrganizations().then((r) => r.ok && setOrgs(r.value));
    }, []),
  );

  return (
    <Screen>
      <H1>For parishes and schools</H1>
      <Body>Bring your parish, school, chaplaincy or association to prayer together.</Body>
      <Card>
        <Label>Every plan includes</Label>
        {PARISH_FEATURES.map((f) => (
          <Body key={f}>• {f}</Body>
        ))}
        <Body muted>Billed yearly by invoice. Groups of up to 15 members stay free.</Body>
      </Card>
      {PARISH_TIERS.map((t) => (
        <Card key={t.id}>
          <View style={s.tierHead}>
            <Text style={s.tierName}>{t.name}</Text>
            <Text style={s.tierPrice}>{formatNaira(t.naira)} / year</Text>
          </View>
          <Body muted>{t.forWhom}</Body>
          <Body>{tierLimitsText(t)}</Body>
        </Card>
      ))}

      {orgs.length ? (
        <Card style={{ paddingVertical: space.sm }}>
          <Label>Your organisations</Label>
          {orgs.map((o) => (
            <NavRow
              key={o.id}
              label={o.name}
              detail={
                parishActive(o)
                  ? `${tierById(o.tier)?.name ?? 'Plan'} · active until ${new Date(o.activeUntil!).toLocaleDateString()} · Open the leader dashboard`
                  : 'Plan not active'
              }
              onPress={() => router.push({ pathname: '/dashboard', params: { org: o.id } })}
            />
          ))}
        </Card>
      ) : null}

      {!account ? (
        <>
          <Body muted>Sign in to request a parish plan.</Body>
          <Button title="Sign in" onPress={() => router.push('/sign-in')} />
        </>
      ) : sent ? (
        <Card>
          <H2>Thank you</H2>
          <Body>{sent}</Body>
        </Card>
      ) : (
        <RequestForm
          onSent={(activatedNow, email) => {
            setSent(
              activatedNow
                ? 'Preview: your plan is switched on for 30 days. Open it above.'
                : `We will email an invoice to ${email}. Once it is paid, your plan is switched on and the leader dashboard appears here.`,
            );
            myOrganizations().then((r) => r.ok && setOrgs(r.value));
          }}
        />
      )}
    </Screen>
  );
}

function RequestForm({ onSent }: { onSent: (activatedNow: boolean, email: string) => void }) {
  const { account } = useAppState();
  const [orgName, setOrgName] = useState('');
  const [orgKind, setOrgKind] = useState<Organization['kind']>('parish');
  const [tier, setTier] = useState<ParishTierId>('parish');
  const [contactName, setContactName] = useState(account?.name ?? '');
  const [contactEmail, setContactEmail] = useState(account?.email ?? '');
  const [country, setCountry] = useState('');
  const [members, setMembers] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <Card>
      <Label>Request a plan</Label>
      {!accountsConfigured ? <Notice>Preview: the plan is switched on straight away so you can try it. No invoice is sent.</Notice> : null}
      <View style={{ gap: space.sm }}>
        {PARISH_TIERS.map((t) => (
          <Pressable
            key={t.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: tier === t.id }}
            onPress={() => setTier(t.id)}
            style={[s.choice, tier === t.id && s.choiceOn]}
          >
            <Text style={s.choiceName}>{t.name}</Text>
            <Text style={s.choicePrice}>{formatNaira(t.naira)} / year</Text>
          </Pressable>
        ))}
      </View>
      <Segmented options={KINDS} value={orgKind} onChange={setOrgKind} />
      <Field id="org-name" label="Name of your parish, school or group" value={orgName} onChangeText={setOrgName} maxLength={100} />
      <Field id="contact-name" label="Your name" value={contactName} onChangeText={setContactName} autoComplete="name" />
      <Field id="contact-email" label="Email for the invoice" value={contactEmail} onChangeText={setContactEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <Field id="country" label="Country" value={country} onChangeText={setCountry} />
      <Field id="members" label="About how many members? (optional)" value={members} onChangeText={(t) => setMembers(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />
      <Field id="message" label="Anything we should know? (optional)" value={message} onChangeText={setMessage} multiline maxLength={1000} />
      <ErrorText>{error}</ErrorText>
      <Button
        title={busy ? 'Sending…' : `Request the ${tierById(tier)!.name.toLowerCase()} (${formatNaira(tierById(tier)!.naira)} / year)`}
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          setError(null);
          const r = await requestParishPlan({
            tier,
            orgName,
            orgKind,
            contactName,
            contactEmail,
            country,
            expectedMembers: members ? Number(members) : undefined,
            message,
          });
          setBusy(false);
          if (!r.ok) return setError(r.error);
          onSent(r.value.activatedNow, contactEmail.trim());
        }}
      />
    </Card>
  );
}

const s = StyleSheet.create({
  tierHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: space.sm },
  tierName: { fontSize: 18, fontWeight: '700', color: colors.ink },
  tierPrice: { fontSize: 16, fontWeight: '700', color: colors.primary, fontVariant: ['tabular-nums'] },
  choice: { flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: space.md, backgroundColor: colors.card },
  choiceOn: { borderColor: colors.primary, borderWidth: 2 },
  choiceName: { fontSize: 15, fontWeight: '600', color: colors.ink },
  choicePrice: { fontSize: 15, fontWeight: '700', color: colors.primary, fontVariant: ['tabular-nums'] },
});
