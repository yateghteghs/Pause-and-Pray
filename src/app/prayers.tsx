import { router } from 'expo-router';
import { Card, Label, NavRow, Screen } from '../components/ui';
import { space } from '../components/theme';
import { PRAYERS } from '../core/prayers';

const GROUPS: { id: string; title: string }[] = [
  { id: 'basic', title: 'Daily prayers' },
  { id: 'marian', title: 'Prayers to Our Lady' },
  { id: 'hours', title: 'Prayer times' },
  { id: 'saints', title: 'Angels and saints' },
];

export default function Prayers() {
  return (
    <Screen>
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
