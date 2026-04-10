import { StyleSheet, Text, View } from 'react-native';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.text}>Phase 2 ideas:</Text>
      <Text style={styles.text}>• Timer controls</Text>
      <Text style={styles.text}>• Baby-friendly filter</Text>
      <Text style={styles.text}>• Surprise me mode</Text>
      <Text style={styles.text}>• Avoid yesterday repeats</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617', padding: 16, gap: 8 },
  title: { color: 'white', fontSize: 22, fontWeight: '700' },
  text: { color: '#CBD5E1' }
});
