import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { loadWorkoutHistory } from '@/storage/appStorage';
import { theme } from '@/theme/brand';
import { BuildWorkoutResult, WorkoutHistoryEntry } from '@/types/build';

function reps(exercise: BuildWorkoutResult['exercises'][number]): string {
  const completed = exercise.completedSets.filter((set) => set.status === 'completed');
  if (!completed.length) return 'skipped';
  const values = completed.map((set) => set.actualReps).join(' / ');
  const first = completed[0];
  if (first.actualAssistanceLb !== undefined) return `${values} @ ${first.actualAssistanceLb} lb assistance`;
  if (first.actualLoadLb) return `${values}${first.perSide ? ' / side' : ''} @ ${first.actualLoadLb} lb`;
  return `${values}${first.perSide ? ' / side' : ''}`;
}

export default function HistoryScreen() {
  const [history, setHistory] = useState<WorkoutHistoryEntry[]>([]);
  useFocusEffect(useCallback(() => { loadWorkoutHistory().then(setHistory); }, []));
  return <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <Text style={styles.kicker}>BUILD + FORGE</Text><Text style={styles.title}>Workout History</Text><Text style={styles.body}>Every session stays recognizable: source, variation, assistance, load, and planned-versus-actual context.</Text>
    {!history.length ? <View style={styles.empty}><Text style={styles.cardTitle}>Nothing recorded yet.</Text><Text style={styles.body}>Complete a BUILD or FORGE session and it will appear here.</Text></View> : history.map((entry) => <View key={entry.id} style={styles.card}>
      <View style={styles.topline}><Text style={[styles.badge, entry.source === 'FORGE' && styles.forgeBadge]}>{entry.source}</Text><Text style={styles.date}>{new Date(entry.completedAt).toLocaleDateString()}</Text></View>
      <Text style={styles.cardTitle}>{entry.title}</Text>
      {entry.source === 'BUILD' ? <><Text style={styles.status}>{entry.status} · {entry.scheduledDay}</Text>{entry.exercises.map((exercise) => <View key={exercise.prescriptionId} style={styles.exercise}><Text style={styles.exerciseName}>{exercise.name}</Text><Text style={styles.result}>{reps(exercise)}</Text><Text style={styles.planned}>Planned · {exercise.prescribedSets.map((set) => set.targetReps).join(' / ')}</Text></View>)}{entry.progressionSummary.map((line) => <Text key={line} style={styles.summary}>{line}</Text>)}</> : <><Text style={styles.status}>{entry.durationMinutes} min · {entry.focus}</Text><Text style={styles.result}>{entry.exerciseNames.join(' · ')}</Text></>}
    </View>)}
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background }, content: { padding: 18, gap: 14, paddingBottom: 48, maxWidth: 720, width: '100%', alignSelf: 'center' }, kicker: { color: theme.colors.purple, fontSize: 12, fontWeight: '900', letterSpacing: 1 }, title: { color: theme.colors.text, fontSize: 31, fontWeight: '900' }, body: { color: theme.colors.textMuted, lineHeight: 21 },
  empty: { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderMuted, borderWidth: 1, borderRadius: 10, padding: 18, gap: 8 }, card: { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderMuted, borderWidth: 1, borderRadius: 10, padding: 16, gap: 9 }, topline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, badge: { color: theme.colors.ink, backgroundColor: theme.colors.lime, borderRadius: 999, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5, fontSize: 10, fontWeight: '900' }, forgeBadge: { backgroundColor: theme.colors.purple, color: theme.colors.text }, date: { color: theme.colors.textSubtle, fontSize: 12 }, cardTitle: { color: theme.colors.text, fontSize: 19, fontWeight: '900' }, status: { color: theme.colors.textMuted, textTransform: 'capitalize' },
  exercise: { paddingTop: 9, borderTopColor: theme.colors.borderMuted, borderTopWidth: 1, gap: 3 }, exerciseName: { color: theme.colors.textSoft, fontWeight: '800' }, result: { color: theme.colors.lime, fontWeight: '800' }, planned: { color: theme.colors.textSubtle, fontSize: 12 }, summary: { color: theme.colors.purple, fontSize: 12, fontWeight: '700' }
});
