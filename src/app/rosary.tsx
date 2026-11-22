import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { GuidePlayer } from '../components/GuidePlayer';
import { colors } from '../components/theme';
import { rosarySteps } from '../core/guides';
import { hasPlus } from '../core/plans';
import { mysterySetFor } from '../core/rosary';
import { useAppState } from '../state/store';

export default function Rosary() {
  const { plus } = useAppState();
  if (!hasPlus(plus)) return <Redirect href="/plus" />;
  const set = mysterySetFor(new Date());
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <GuidePlayer steps={rosarySteps(set)} prayerId={`rosary:${set}`} finishTitle="You have prayed the Rosary" />
    </View>
  );
}
