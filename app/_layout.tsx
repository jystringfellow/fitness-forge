import { Tabs } from 'expo-router';
import { theme } from '@/theme/brand';

export default function RootLayout() {
  return (
    <Tabs
      screenOptions={{
        headerTitleAlign: 'center',
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        headerShadowVisible: false,
        tabBarActiveTintColor: theme.colors.lime,
        tabBarInactiveTintColor: theme.colors.textSubtle,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.borderMuted,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6
        },
        tabBarLabelStyle: { fontWeight: '700' },
        sceneStyle: { backgroundColor: theme.colors.background }
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Generate' }} />
      <Tabs.Screen name="workout" options={{ title: 'Result' }} />
      <Tabs.Screen name="library" options={{ title: 'Library' }} />
      <Tabs.Screen name="favorites" options={{ title: 'Favorites' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
