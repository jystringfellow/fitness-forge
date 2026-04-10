import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { loadFavorites } from '@/storage/workoutStorage';
import { WorkoutPlan } from '@/types/workout';

export default function FavoritesScreen() {
  const [favorites, setFavorites] = useState<WorkoutPlan[]>([]);

  useEffect(() => {
    loadFavorites().then(setFavorites);
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Favorites</Text>
      {favorites.length === 0 ? <Text style={styles.empty}>No saved workouts yet.</Text> : null}
      {favorites.map((plan) => (
        <View key={plan.createdAt} style={styles.card}>
          <Text style={styles.name}>{plan.title}</Text>
          <Text style={styles.detail}>{new Date(plan.createdAt).toLocaleString()}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1E' },
  content: { padding: 16, gap: 10 },
  title: { color: 'white', fontSize: 22, fontWeight: '700' },
  empty: { color: '#9CA3AF' },
  card: { backgroundColor: '#111827', borderRadius: 10, padding: 12 },
  name: { color: '#F9FAFB', fontWeight: '700' },
  detail: { color: '#9CA3AF' }
});
