import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { addFavorite } from '@/storage/workoutStorage';
import { WorkoutPlan } from '@/types/workout';

export default function WorkoutScreen() {
  const params = useLocalSearchParams<{ plan?: string }>();
  const plan = params.plan ? (JSON.parse(params.plan) as WorkoutPlan) : null;

  if (!plan) {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>Generate a workout first.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{plan.title}</Text>
      <Text style={styles.meta}>Attachment: {plan.input.attachment}</Text>

      <View style={styles.block}>
        <Text style={styles.blockTitle}>Cardio / Plyo ({plan.cardioBlock[0]})</Text>
        {plan.cardioBlock.slice(1).map((line) => (
          <Text key={line} style={styles.line}>• {line}</Text>
        ))}
      </View>

      <View style={styles.block}>
        <Text style={styles.blockTitle}>Main Block</Text>
        <Text style={styles.line}>
          {plan.mainBlock.rounds} rounds · {plan.mainBlock.workSeconds}s work / {plan.mainBlock.restSeconds}s rest
        </Text>
        {plan.mainBlock.exercises.map((exercise) => (
          <View key={exercise.id} style={styles.exerciseRow}>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
            <Text style={styles.cue}>{exercise.cue}</Text>
          </View>
        ))}
      </View>

      {plan.note ? <Text style={styles.note}>{plan.note}</Text> : null}

      <TouchableOpacity style={styles.favoriteButton} onPress={() => addFavorite(plan)}>
        <Text style={styles.favoriteText}>Save to Favorites</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  content: { padding: 16, gap: 12, paddingBottom: 30 },
  centered: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
  empty: { color: 'white', fontSize: 18 },
  title: { color: 'white', fontSize: 24, fontWeight: '700' },
  meta: { color: '#A5B4FC' },
  block: { backgroundColor: '#111827', borderRadius: 12, padding: 12, gap: 6 },
  blockTitle: { color: '#93C5FD', fontWeight: '700', fontSize: 16 },
  line: { color: '#D1D5DB' },
  exerciseRow: { borderTopColor: '#1F2937', borderTopWidth: 1, paddingTop: 8, marginTop: 8 },
  exerciseName: { color: '#F9FAFB', fontWeight: '700' },
  cue: { color: '#9CA3AF', fontSize: 13, marginTop: 2 },
  note: { color: '#86EFAC', fontStyle: 'italic' },
  favoriteButton: {
    backgroundColor: '#FCD34D',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center'
  },
  favoriteText: { color: '#78350F', fontWeight: '800' }
});
