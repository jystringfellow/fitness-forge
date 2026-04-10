import { Tabs } from 'expo-router';

export default function RootLayout() {
  return (
    <Tabs screenOptions={{ headerTitleAlign: 'center' }}>
      <Tabs.Screen name="index" options={{ title: 'Generate' }} />
      <Tabs.Screen name="workout" options={{ title: 'Result' }} />
      <Tabs.Screen name="library" options={{ title: 'Library' }} />
      <Tabs.Screen name="favorites" options={{ title: 'Favorites' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
