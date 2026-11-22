import { ComponentProps } from 'react';
import { ColorValue } from 'react-native';
import { Tabs } from 'expo-router/js-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../components/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function icon(active: IconName, idle: IconName) {
  function TabIcon({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) {
    return <Ionicons name={focused ? active : idle} color={color as string} size={size} />;
  }
  return TabIcon;
}

/** The footer menu: Today stays short, everything else lives one tap away. */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { color: colors.ink },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.line, height: 68, paddingTop: 6, paddingBottom: 10 },
        tabBarLabelStyle: { fontSize: 11, lineHeight: 15, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', headerTitle: 'Pause & Pray', tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen name="readings" options={{ title: 'Readings', headerTitle: 'Today’s readings', tabBarIcon: icon('book', 'book-outline') }} />
      <Tabs.Screen name="prayers" options={{ title: 'Prayers', tabBarIcon: icon('rose', 'rose-outline') }} />
      <Tabs.Screen name="groups" options={{ title: 'Groups', headerTitle: 'Prayer groups', tabBarIcon: icon('people', 'people-outline') }} />
      <Tabs.Screen name="me" options={{ title: 'Me', headerTitle: 'Your prayer', tabBarIcon: icon('person-circle', 'person-circle-outline') }} />
    </Tabs>
  );
}
