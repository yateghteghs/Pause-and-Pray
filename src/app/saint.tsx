import { StyleSheet, Text, View } from 'react-native';
import { Body, Card, H1, Label, Screen } from '../components/ui';
import { colors, space } from '../components/theme';
import { COLOUR_HEX, saintOfDay } from '../core/liturgical';
import { formatDayKey } from '../core/dates';
import { useAppState } from '../state/store';

export default function Saint() {
  const { country } = useAppState();
  const found = saintOfDay(new Date(), { country });
  if (!found) {
    return (
      <Screen>
        <Body>No saint’s day in the next two weeks.</Body>
      </Screen>
    );
  }
  const { saint, when } = found;
  return (
    <Screen>
      <Label>{when === 'today' ? 'Saint of the day' : `Coming up · ${formatDayKey(when)}`}</Label>
      <H1>{saint.title}</H1>
      <View style={s.facts}>
        <Fact label="Lived" value={saint.lived} />
        <Fact label="Where" value={saint.place} />
      </View>
      <Card>
        <Body style={{ fontSize: 17, lineHeight: 27 }}>{saint.life}</Body>
      </Card>
      {!saint.observed && when === 'today' ? (
        <Body muted>Today’s celebration takes precedence, so this saint’s memorial is not kept at Mass this year.</Body>
      ) : null}
      <View style={s.colourRow}>
        <View style={[s.dot, { backgroundColor: COLOUR_HEX[saint.colour] }]} />
        <Text style={s.colourText}>Vestments: {saint.colour}</Text>
      </View>
      <Body muted>Written for Pause & Pray. Pending review by our theological adviser.</Body>
    </Screen>
  );
}

function Fact({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={s.fact}>
      <Text style={s.factLabel}>{label}</Text>
      <Text style={s.factValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  fact: { flexGrow: 1, flexBasis: 140, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: space.sm + 2, gap: 2 },
  factLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: colors.muted },
  factValue: { fontSize: 15, color: colors.ink, lineHeight: 20 },
  colourRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: colors.line },
  colourText: { color: colors.muted, textTransform: 'capitalize' },
});
