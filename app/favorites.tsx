import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { loadFavorites } from '@/storage/workoutStorage';
import { theme } from '@/theme/brand';
import { WorkoutPlan } from '@/types/workout';

export default function FavoritesScreen() {
  const [favorites, setFavorites] = useState<WorkoutPlan[]>([]);

  useEffect(() => {
    loadFavorites().then(setFavorites);
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.kicker}>{favorites.length} saved</Text>
        <Text style={styles.title}>Favorites</Text>
      </View>
      {favorites.length === 0 ? <Text style={styles.empty}>No saved workouts yet.</Text> : null}
      {favorites.map((plan) => (
        <View key={plan.createdAt} style={styles.card}>
          <Text style={styles.name}>{plan.title}</Text>
          <Text style={styles.detail}>{plan.input.time} min · {plan.input.focus}</Text>
          <Text style={styles.date}>{new Date(plan.createdAt).toLocaleString()}</Text>
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
    gap: 6
  },
  name: { color: theme.colors.text, fontWeight: '900', fontSize: 16 },
  detail: { color: theme.colors.lime, fontWeight: '800', textTransform: 'capitalize' },
  date: { color: theme.colors.textMuted, fontWeight: '700' }
});
