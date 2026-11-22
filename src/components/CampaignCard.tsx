import { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { space } from './theme';
import { currentCampaign, Sponsor } from '../core/campaigns';
import { formatDayKey } from '../core/dates';
import { cachedSponsors, refreshSponsors } from '../features/campaigns';
import { useAppState } from '../state/store';

/** Today's seasonal campaign: progress, and "Made possible by" when it has a sponsor. */
export function CampaignCard() {
  const { events, country } = useAppState();
  const [sponsors, setSponsors] = useState<Record<string, Sponsor>>(cachedSponsors);
  useEffect(() => {
    refreshSponsors().then(setSponsors).catch(() => {});
  }, []);

  const c = currentCampaign(new Date(), events, sponsors, { country });
  if (!c) return null;

  return (
    <View style={k.card}>
      <Text style={k.kicker}>{c.state === 'active' ? `Day ${c.dayNumber} of ${c.totalDays}` : `Starts ${formatDayKey(c.start)}`}</Text>
      <Text style={k.title}>{c.title}</Text>
      <Text style={k.goal}>{c.goal}</Text>
      {c.state === 'active' ? (
        <>
          <View style={k.track} accessibilityLabel={`Prayed on ${c.daysPrayed} of ${c.dayNumber} days so far`}>
            <View style={[k.fill, { width: `${Math.round((c.daysPrayed / c.totalDays) * 100)}%` }]} />
          </View>
          <Text style={k.goal}>
            You have prayed on {c.daysPrayed} of {c.dayNumber} {c.dayNumber === 1 ? 'day' : 'days'} so far.
          </Text>
        </>
      ) : (
        <Text style={k.goal}>
          {c.daysUntil === 1 ? 'Starts tomorrow.' : `Starts in ${c.daysUntil} days.`} Your prayer times count automatically.
        </Text>
      )}
      {c.sponsor ? (
        <Text style={k.sponsor} onPress={c.sponsor.url ? () => Linking.openURL(c.sponsor!.url!) : undefined}>
          Made possible by {c.sponsor.name}
          {c.sponsor.message ? ` · ${c.sponsor.message}` : ''}
        </Text>
      ) : null}
    </View>
  );
}

const k = StyleSheet.create({
  card: { backgroundColor: '#5B2C83', borderRadius: 14, padding: space.md, gap: space.xs },
  kicker: { color: '#E8D9F5', fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  goal: { color: '#EFE6F7', fontSize: 15, lineHeight: 21 },
  track: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden', marginVertical: space.xs },
  fill: { height: 8, backgroundColor: '#FFFFFF' },
  sponsor: { color: '#E8D9F5', fontSize: 12, paddingTop: space.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.3)', marginTop: space.xs },
});
