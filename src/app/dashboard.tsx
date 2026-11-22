import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Body, Button, Card, H1, Label, NavRow, Screen } from '../components/ui';
import { ErrorText } from '../components/form';
import { colors, space } from '../components/theme';
import { OrgDashboardRow, Organization } from '../core/groups';
import { parishActive } from '../core/plans';
import { attachGroupToOrg, myOrganizations, orgDashboard } from '../features/groups';
import { useAppState } from '../state/store';

const pct = (n: number) => `${Math.round(n * 100)}%`;

export default function Dashboard() {
  const { org: orgId } = useLocalSearchParams<{ org: string }>();
  const { groups } = useAppState();
  const [org, setOrg] = useState<Organization | null>(null);
  const [rows, setRows] = useState<OrgDashboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    myOrganizations().then((r) => r.ok && setOrg(r.value.find((o) => o.id === orgId) ?? null));
    orgDashboard(orgId).then((r) => (r.ok ? setRows(r.value) : setError(r.error)));
  }, [orgId]);
  useFocusEffect(load);

  if (!org) return <Screen>{error ? <ErrorText>{error}</ErrorText> : <Body muted>Loading…</Body>}</Screen>;

  const active = parishActive(org);
  const movable = groups.filter((g) => g.role === 'admin' && g.orgId !== org.id);
  const totals = (rows ?? []).reduce(
    (t, r) => ({ members: t.members + r.members, today: t.today + r.prayedToday, w7: t.w7 + r.rate7d * r.members, w30: t.w30 + r.rate30d * r.members }),
    { members: 0, today: 0, w7: 0, w30: 0 },
  );

  return (
    <Screen>
      <Stack.Screen options={{ title: org.name }} />
      <Label>Leader dashboard</Label>
      <H1>{org.name}</H1>
      <Body muted>{active ? `Parish plan active until ${new Date(org.activeUntil!).toLocaleDateString()}` : 'Parish plan not active'}</Body>

      <Card>
        <View style={d.kpis}>
          <Kpi value={String(totals.members)} label={totals.members === 1 ? 'member' : 'members'} />
          <Kpi value={String(totals.today)} label="prayed today" />
          <Kpi value={totals.members ? pct(totals.w7 / totals.members) : '–'} label="last 7 days" />
          <Kpi value={totals.members ? pct(totals.w30 / totals.members) : '–'} label="last 30 days" />
        </View>
        <Body muted>Share of member-days with prayer. Leaders see totals only, never who prayed what.</Body>
      </Card>

      {(rows ?? []).map((r) => (
        <Card key={r.groupId}>
          <Text style={d.group}>{r.groupName}</Text>
          <Body muted>
            {r.members} {r.members === 1 ? 'member' : 'members'} · {r.prayedToday} prayed today
          </Body>
          <Bar label="7 days" value={r.rate7d} />
          <Bar label="30 days" value={r.rate30d} />
          <Button kind="ghost" title="Open group" onPress={() => router.push({ pathname: '/group/[id]', params: { id: r.groupId } })} />
        </Card>
      ))}
      {rows && !rows.length ? <Body>No groups in {org.name} yet.</Body> : null}

      {active ? <Button title={`Start a group in ${org.name}`} onPress={() => router.push({ pathname: '/group/new', params: { org: org.id } })} /> : null}
      {active && movable.length ? (
        <Card style={{ paddingVertical: space.sm }}>
          <Label>Move a group you lead into {org.name}</Label>
          {movable.map((g) => (
            <NavRow
              key={g.id}
              label={g.name}
              detail="Removes the 15-member limit and adds announcements"
              onPress={async () => {
                const r = await attachGroupToOrg(g.id, org.id);
                if (!r.ok) setError(r.error);
                load();
              }}
            />
          ))}
        </Card>
      ) : null}
      <ErrorText>{error}</ErrorText>
    </Screen>
  );
}

function Kpi({ value, label }: { value: string; label: string }) {
  return (
    <View style={d.kpi}>
      <Text style={d.kpiValue}>{value}</Text>
      <Text style={d.kpiLabel}>{label}</Text>
    </View>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <View style={d.barRow}>
      <Text style={d.barLabel}>{label}</Text>
      <View style={d.barTrack}>
        <View style={[d.barFill, { width: `${Math.min(100, Math.round(value * 100))}%` }]} />
      </View>
      <Text style={d.barValue}>{pct(value)}</Text>
    </View>
  );
}

const d = StyleSheet.create({
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  kpi: { flexGrow: 1, flexBasis: 70, alignItems: 'center' },
  kpiValue: { fontSize: 24, fontWeight: '700', color: colors.primary, fontVariant: ['tabular-nums'] },
  kpiLabel: { fontSize: 12, color: colors.muted, textAlign: 'center' },
  group: { fontSize: 18, fontWeight: '700', color: colors.ink },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  barLabel: { width: 60, fontSize: 13, color: colors.muted },
  barTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.line, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: colors.primary },
  barValue: { width: 42, textAlign: 'right', fontSize: 13, fontWeight: '600', color: colors.ink, fontVariant: ['tabular-nums'] },
});
