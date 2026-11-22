import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/ui';
import { colors, space } from '../components/theme';
import { continueAsGuest, getState } from '../state/store';

export default function Welcome() {
  return (
    <SafeAreaView style={w.root}>
      <View style={w.top}>
        <Text style={w.kicker}>Pause & Pray</Text>
        <Text style={w.title}>Pause and pray before you scroll.</Text>
        <Text style={w.lead}>
          A short Catholic prayer before Instagram, TikTok, WhatsApp or YouTube, with the daily Mass readings and the
          saint of the day.
        </Text>
      </View>
      <View style={w.actions}>
        <Button title="Create an account" onPress={() => router.push('/sign-up')} />
        <Button kind="secondary" title="Sign in" onPress={() => router.push('/sign-in')} />
        <Button
          kind="ghost"
          title="Continue without an account"
          onPress={() => {
            continueAsGuest();
            router.replace(getState().onboarded ? '/' : '/onboarding');
          }}
        />
        <Text style={w.note}>
          An account is optional. Your prayers, intentions and history stay on this phone either way.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const w = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary },
  top: { flex: 1, justifyContent: 'center', padding: space.lg, gap: space.md },
  kicker: { color: '#E7D9A8', fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: '#fff', fontSize: 34, lineHeight: 40, fontWeight: '700' },
  lead: { color: '#DDE9E1', fontSize: 17, lineHeight: 25 },
  actions: { backgroundColor: colors.bg, padding: space.lg, gap: space.sm, borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  note: { color: colors.muted, fontSize: 13, lineHeight: 18, textAlign: 'center' },
});
