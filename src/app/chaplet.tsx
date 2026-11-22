import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { GuidePlayer } from '../components/GuidePlayer';
import { colors } from '../components/theme';
import { chapletSteps } from '../core/guides';
import { hasPlus } from '../core/plans';
import { useAppState } from '../state/store';

export default function Chaplet() {
  const { plus } = useAppState();
  if (!hasPlus(plus)) return <Redirect href="/plus" />;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <GuidePlayer steps={chapletSteps()} prayerId="divine-mercy-chaplet" finishTitle="You have prayed the Chaplet" />
    </View>
  );
}
