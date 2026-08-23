import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { createBuildWorkout } from '@/data/buildProgram';
import { loadActiveBuildWorkout, loadBuildProfile, loadWorkoutHistory, saveActiveBuildWorkout } from '@/storage/appStorage';
import { brandIcon, theme } from '@/theme/brand';
import { BuildProfile, BuildWorkoutPrescription, BuildWorkoutResult } from '@/types/build';

function setSummary(exercise: BuildWorkoutPrescription['exercises'][number]): string {
  const reps = exercise.sets.map((set) => `${set.targetReps}${set.targetType === 'minimum' ? '+' : ''}`).join(' / ');
  const first = exercise.sets[0];
  if (first?.targetAssistanceLb !== undefined) return `${reps} · ${first.targetAssistanceLb} lb assistance`;
  if (first?.targetLoadLb) return `${reps}${first.perSide ? ' / side' : ''} · ${first.targetLoadLb} lb`;
  return `${reps}${first?.perSide ? ' / side' : ''}`;
}

function restSummary(seconds: number): string {
  if (!seconds) return 'Assessment set · no prescribed interval';
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `Rest ${minutes}:${remaining.toString().padStart(2, '0')} between sets`;
}

export default function TodayScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<BuildProfile | null>(null);
  const [workout, setWorkout] = useState<BuildWorkoutPrescription | null>(null);
  const [lastResult, setLastResult] = useState<BuildWorkoutResult | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let active = true;
    const refresh = async () => {
      const savedProfile = await loadBuildProfile();
      if (!active) return;
      setProfile(savedProfile);
      if (savedProfile?.active) {
        let savedWorkout = await loadActiveBuildWorkout();
        if (!savedWorkout) {
          savedWorkout = createBuildWorkout(savedProfile);
          await saveActiveBuildWorkout(savedWorkout);
        }
        const history = await loadWorkoutHistory();
        if (!active) return;
        setWorkout(savedWorkout);
        setLastResult((history.find((entry) => entry.source === 'BUILD') as BuildWorkoutResult | undefined) ?? null);
      } else {
        setWorkout(null);
        setLastResult(null);
      }
      setLoading(false);
    };
    refresh().catch(() => setLoading(false));
    return () => { active = false; };
  }, []));

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={theme.colors.lime} /><Text style={styles.muted}>Preparing today…</Text></View>;
  }

  if (!profile?.active || !workout) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Image source={brandIcon} style={styles.mark} />
          <Text style={styles.kicker}>BUILD + FORGE</Text>
          <Text style={styles.title}>Build your capabilities. Forge your fitness.</Text>
          <Text style={styles.body}>Structured progress when you have a goal. A varied workout when you want to move.</Text>
        </View>
        <View style={styles.modeCard}>
          <Text style={styles.modeBadge}>BUILD</Text>
          <Text style={styles.cardTitle}>Turn “not yet” into “I can.”</Text>
          <Text style={styles.body}>Set up pull-up and push-up goals once. Fitness Forge will remember, prescribe, and progress your Monday, Wednesday, and Friday sessions.</Text>
          <TouchableOpacity accessibilityRole="button" style={styles.primary} onPress={() => router.push('/build')}>
            <Text style={styles.primaryText}>Activate BUILD</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.modeCard}>
          <Text style={[styles.modeBadge, styles.forgeBadge]}>FORGE</Text>
          <Text style={styles.cardTitle}>Make today’s workout.</Text>
          <Text style={styles.body}>Choose time, focus, energy, and equipment. Keep the variety you already know.</Text>
          <TouchableOpacity accessibilityRole="button" style={styles.secondary} onPress={() => router.push('/forge')}>
            <Text style={styles.secondaryText}>Open FORGE</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.todayHeader}>
        <View>
          <Text style={styles.kicker}>NEXT BUILD · {workout.scheduledDay.toUpperCase()}</Text>
          <Text style={styles.title}>{workout.title}</Text>
        </View>
        <Text style={styles.buildBadge}>BUILD</Text>
      </View>
      <Text style={styles.body}>Your next scheduled session is ready. Missed days do not create debt—continue when you can.</Text>

      {workout.exercises.map((exercise) => (
        <View key={exercise.id} style={styles.exerciseCard}>
          <View style={styles.exerciseTopline}>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
            {exercise.optional ? <Text style={styles.optional}>OPTIONAL</Text> : null}
          </View>
          <Text style={styles.prescription}>{setSummary(exercise)}</Text>
          <Text style={styles.rest}>{restSummary(exercise.restSecondsBetweenSets)}</Text>
          {exercise.progressionLabel ? <Text style={styles.progression}>{exercise.progressionLabel}</Text> : null}
          {lastResult ? (() => {
            const last = lastResult.exercises.find((item) => item.kind === exercise.kind && item.variation === exercise.variation);
            if (!last) return null;
            const actual = last.completedSets.filter((set) => set.status === 'completed').map((set) => set.actualReps).join(' / ');
            return actual ? <Text style={styles.last}>Last time: {actual}</Text> : null;
          })() : null}
        </View>
      ))}

      <TouchableOpacity accessibilityRole="button" style={styles.primary} onPress={() => router.push('/build-workout')}>
        <Text style={styles.primaryText}>START WORKOUT</Text>
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" style={styles.forgeLink} onPress={() => router.push('/forge')}>
        <Text style={styles.forgeLinkText}>Want variety today? Open FORGE →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 18, gap: 14, paddingBottom: 44, maxWidth: 720, width: '100%', alignSelf: 'center' },
  center: { flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', gap: 12 },
  muted: { color: theme.colors.textMuted },
  hero: { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 10, padding: 20, gap: 12 },
  mark: { width: 58, height: 58 },
  kicker: { color: theme.colors.purple, fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: theme.colors.text, fontSize: 32, fontWeight: '900', lineHeight: 37 },
  body: { color: theme.colors.textMuted, fontSize: 15, lineHeight: 22 },
  modeCard: { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderMuted, borderWidth: 1, borderRadius: 10, padding: 18, gap: 11 },
  modeBadge: { alignSelf: 'flex-start', color: theme.colors.ink, backgroundColor: theme.colors.lime, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, overflow: 'hidden', fontSize: 11, fontWeight: '900' },
  forgeBadge: { backgroundColor: theme.colors.purple, color: theme.colors.text },
  cardTitle: { color: theme.colors.text, fontSize: 21, fontWeight: '900' },
  primary: { backgroundColor: theme.colors.lime, borderRadius: 8, paddingVertical: 16, paddingHorizontal: 18, alignItems: 'center' },
  primaryText: { color: theme.colors.ink, fontSize: 16, fontWeight: '900' },
  secondary: { borderColor: theme.colors.border, borderWidth: 1, borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  secondaryText: { color: theme.colors.text, fontWeight: '900' },
  todayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, paddingVertical: 8 },
  buildBadge: { color: theme.colors.ink, backgroundColor: theme.colors.lime, borderRadius: 999, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6, fontWeight: '900', fontSize: 12 },
  exerciseCard: { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderMuted, borderWidth: 1, borderRadius: 10, padding: 16, gap: 7 },
  exerciseTopline: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  exerciseName: { color: theme.colors.text, fontSize: 18, fontWeight: '900', flex: 1 },
  optional: { color: theme.colors.textSubtle, fontSize: 10, fontWeight: '900' },
  prescription: { color: theme.colors.lime, fontSize: 21, fontWeight: '900' },
  progression: { color: theme.colors.textSoft, fontWeight: '700' },
  rest: { color: theme.colors.purple, fontSize: 13, fontWeight: '800' },
  last: { color: theme.colors.textSubtle, fontSize: 13 },
  forgeLink: { alignItems: 'center', paddingVertical: 10 },
  forgeLinkText: { color: theme.colors.purple, fontWeight: '800' }
});
