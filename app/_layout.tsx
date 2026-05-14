import { Tabs } from 'expo-router';

export default function RootLayout() {
  return (
    <Tabs
      screenOptions={{
        headerTitleAlign: 'center',
        headerStyle: { backgroundColor: '#140B1F' },
        headerTintColor: '#FBF7FF',
        headerShadowVisible: false,
        tabBarActiveTintColor: '#A6FF3D',
        tabBarInactiveTintColor: '#9B8CB2',
        tabBarStyle: {
          backgroundColor: '#140B1F',
          borderTopColor: '#33214A',
          height: 62,
          paddingBottom: 8,
          paddingTop: 6
        },
        tabBarLabelStyle: { fontWeight: '700' },
        sceneStyle: { backgroundColor: '#140B1F' }
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
