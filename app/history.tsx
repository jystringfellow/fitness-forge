import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { loadHistory } from '@/storage/workoutStorage';
import { theme } from '@/theme/brand';
import { WorkoutPlan } from '@/types/workout';

export default function HistoryScreen() {
  const [items, setItems] = useState<WorkoutPlan[]>([]);

  useEffect(() => {
    loadHistory().then(setItems);
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.kicker}>{items.length} generated</Text>
        <Text style={styles.title}>History</Text>
      </View>
      {items.length === 0 ? <Text style={styles.empty}>Generate a workout to start your history.</Text> : null}
      {items.map((plan) => (
        <View key={plan.createdAt} style={styles.card}>
          <Text style={styles.name}>{plan.title}</Text>
          <View style={styles.detailRow}>
            <Text style={styles.badge}>{plan.input.time} min</Text>
            <Text style={styles.detail}>{plan.input.focus}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 18, gap: 12, paddingBottom: 36 },
  header: { gap: 4, marginBottom: 4 },
  kicker: { color: theme.colors.purple, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: theme.colors.text, fontSize: 30, fontWeight: '900' },
  empty: {
    color: theme.colors.textMuted,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderMuted,
    borderWidth: 1,
    borderRadius: 8,
    padding: 16
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderMuted,
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    gap: 10
  },
  name: { color: theme.colors.text, fontWeight: '900', fontSize: 16 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    color: theme.colors.ink,
    backgroundColor: theme.colors.lime,
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 4,
    fontWeight: '900'
  },
  detail: { color: theme.colors.textMuted, fontWeight: '700', textTransform: 'capitalize' }
});
