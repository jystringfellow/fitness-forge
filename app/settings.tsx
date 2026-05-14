import { StyleSheet, Text, View } from 'react-native';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>Coming next</Text>
      <Text style={styles.title}>Settings</Text>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Phase 2 ideas</Text>
        <Text style={styles.text}>Timer controls</Text>
        <Text style={styles.text}>Baby-friendly filter</Text>
        <Text style={styles.text}>Surprise me mode</Text>
        <Text style={styles.text}>Avoid yesterday repeats</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#140B1F', padding: 18, gap: 10 },
  kicker: { color: '#D872FF', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: '#FBF7FF', fontSize: 30, fontWeight: '900' },
  panel: {
    backgroundColor: '#1B1028',
    borderColor: '#3A2253',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    gap: 12,
    marginTop: 6
  },
  panelTitle: { color: '#A6FF3D', fontWeight: '900', fontSize: 16 },
  text: { color: '#E7DAF4', fontWeight: '700' }
});
