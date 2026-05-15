import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/theme/brand';

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
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 18, gap: 10 },
  kicker: { color: theme.colors.purple, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: theme.colors.text, fontSize: 30, fontWeight: '900' },
  panel: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderMuted,
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    gap: 12,
    marginTop: 6
  },
  panelTitle: { color: theme.colors.lime, fontWeight: '900', fontSize: 16 },
  text: { color: theme.colors.textSoft, fontWeight: '700' }
});
