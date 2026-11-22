import { router } from 'expo-router';
import { Card, Label, NavRow, Screen , Body, H2 } from '../../components/ui';
import { space } from '../../components/theme';
import { PRAYERS } from '../../core/prayers';
import { mysteryOfTheDay } from '../../core/rosary';
import { hasPlus, PLUS_FEATURES } from '../../core/plans';
import { plusAvailable } from '../../features/billing';
import { useAppState } from '../../state/store';

const PLUS_ROUTES = { 'rosary-guide': '/rosary', 'chaplet-guide': '/chaplet', novena: '/novena' } as const;

const GROUPS: { id: string; title: string }[] = [
  { id: 'basic', title: 'Daily prayers' },
  { id: 'marian', title: 'Prayers to Our Lady' },
  { id: 'hours', title: 'Prayer times' },
  { id: 'saints', title: 'Angels and saints' },
];

export default function Prayers() {
  const mystery = mysteryOfTheDay(new Date());
  const { plus } = useAppState();
  const unlocked = hasPlus(plus);
  return (
    <Screen>
      {plusAvailable ? (
        <Card style={{ paddingVertical: space.sm }}>
          <Label>{unlocked ? 'Pray more deeply · Plus' : 'Pray more deeply · with Plus'}</Label>
          {PLUS_FEATURES.map((f) => (
            <NavRow
              key={f.id}
              label={f.title}
              detail={unlocked ? f.detail : `Plus · ${f.detail}`}
              onPress={() => router.push(unlocked ? PLUS_ROUTES[f.id] : '/plus')}
            />
          ))}
        </Card>
      ) : null}
      <Card>
        <Label>Today’s Rosary</Label>
        <H2>{mystery.title}</H2>
        {mystery.items.map((m, i) => (
          <Body key={m}>
            {i + 1}. {m}
          </Body>
        ))}
      </Card>
      {GROUPS.map((g) => (
        <Card key={g.id} style={{ paddingVertical: space.sm }}>
          <Label>{g.title}</Label>
          {PRAYERS.filter((p) => p.category === g.id).map((p) => (
            <NavRow key={p.id} label={p.title} onPress={() => router.push({ pathname: '/prayer/[id]', params: { id: p.id } })} />
          ))}
        </Card>
      ))}
    </Screen>
  );
}
