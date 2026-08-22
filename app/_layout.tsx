import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { theme } from '@/theme/brand';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" backgroundColor={theme.colors.background} />
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
        <Tabs.Screen name="index" options={{ title: 'Today' }} />
        <Tabs.Screen name="build" options={{ title: 'Build' }} />
        <Tabs.Screen name="forge" options={{ title: 'Forge' }} />
        <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
        <Tabs.Screen name="history" options={{ title: 'History' }} />
        <Tabs.Screen name="workout" options={{ href: null, title: 'FORGE Workout' }} />
        <Tabs.Screen name="build-workout" options={{ href: null, title: 'BUILD Workout' }} />
        <Tabs.Screen name="library" options={{ href: null, title: 'Library' }} />
      </Tabs>
    </>
  );
}
