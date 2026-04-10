import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { loadHistory } from '@/storage/workoutStorage';
import { WorkoutPlan } from '@/types/workout';

export default function HistoryScreen() {
  const [items, setItems] = useState<WorkoutPlan[]>([]);

  useEffect(() => {
    loadHistory().then(setItems);
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>History</Text>
      {items.length === 0 ? <Text style={styles.empty}>Generate a workout to start your history.</Text> : null}
      {items.map((plan) => (
        <View key={plan.createdAt} style={styles.card}>
          <Text style={styles.name}>{plan.title}</Text>
          <Text style={styles.detail}>{plan.input.time} min · {plan.input.focus}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  content: { padding: 16, gap: 10 },
  title: { color: 'white', fontSize: 22, fontWeight: '700' },
  empty: { color: '#9CA3AF' },
  card: { backgroundColor: '#1F2937', borderRadius: 10, padding: 12 },
  name: { color: '#F9FAFB', fontWeight: '700' },
  detail: { color: '#D1D5DB' }
});
