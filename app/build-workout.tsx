import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { advanceBuildProfile, getProgressionSummaries } from '@/lib/buildProgression';
import { appendWorkoutHistory, loadActiveBuildWorkout, loadBuildProfile, saveActiveBuildWorkout, saveBuildProfile } from '@/storage/appStorage';
import { theme } from '@/theme/brand';
import { BuildProfile, BuildWorkoutPrescription, BuildWorkoutResult, ExercisePrescription, SetStatus } from '@/types/build';

interface DraftSet {
  id: string;
  targetReps: number;
  targetLoadLb?: number;
  targetAssistanceLb?: number;
  perSide?: boolean;
  actualReps: number;
  actualLoadLb?: number;
  actualAssistanceLb?: number;
  status: SetStatus;
}

interface DraftExercise extends Omit<ExercisePrescription, 'sets'> {
  sets: DraftSet[];
  skipped: boolean;
  notes: string;
}

interface RestTimer {
  exerciseIndex: number;
  remainingSeconds: number;
}

function makeDraft(workout: BuildWorkoutPrescription): DraftExercise[] {
  return workout.exercises.map((exercise) => ({
    ...exercise,
    skipped: false,
    notes: '',
    sets: exercise.sets.map((set) => ({
      ...set,
      actualReps: set.targetReps,
      actualLoadLb: set.targetLoadLb,
      actualAssistanceLb: set.targetAssistanceLb,
      status: 'pending'
    }))
  }));
}

function Stepper({ label, value, step = 1, minimum = 0, onChange }: { label: string; value: number; step?: number; minimum?: number; onChange: (value: number) => void }) {
  return <View style={styles.stepper}><Text style={styles.stepperLabel}>{label}</Text><View style={styles.stepperControls}><TouchableOpacity accessibilityLabel={`Decrease ${label}`} style={styles.stepButton} onPress={() => onChange(Math.max(minimum, value - step))}><Text style={styles.stepText}>−</Text></TouchableOpacity><Text style={styles.stepValue}>{value}</Text><TouchableOpacity accessibilityLabel={`Increase ${label}`} style={styles.stepButton} onPress={() => onChange(value + step)}><Text style={styles.stepText}>+</Text></TouchableOpacity></View></View>;
}

export default function BuildWorkoutScreen() {
  const router = useRouter();
  const [workout, setWorkout] = useState<BuildWorkoutPrescription | null>(null);
  const [profile, setProfile] = useState<BuildProfile | null>(null);
  const [draft, setDraft] = useState<DraftExercise[]>([]);
  const [startedAt] = useState(() => new Date().toISOString());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<string[] | null>(null);
  const [restTimer, setRestTimer] = useState<RestTimer | null>(null);

  useEffect(() => {
    Promise.all([loadActiveBuildWorkout(), loadBuildProfile()]).then(([savedWorkout, savedProfile]) => {
      setWorkout(savedWorkout); setProfile(savedProfile); if (savedWorkout) setDraft(makeDraft(savedWorkout)); setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!restTimer || restTimer.remainingSeconds <= 0) return;
    const interval = setInterval(() => {
      setRestTimer((current) => current ? { ...current, remainingSeconds: Math.max(0, current.remainingSeconds - 1) } : null);
    }, 1000);
    return () => clearInterval(interval);
  }, [restTimer?.remainingSeconds]);

  const updateSet = (exerciseIndex: number, setIndex: number, update: Partial<DraftSet>) => {
    setDraft((current) => current.map((exercise, index) => index !== exerciseIndex ? exercise : {
      ...exercise, sets: exercise.sets.map((set, innerIndex) => innerIndex === setIndex ? { ...set, ...update } : set)
    }));
  };

  const toggleSetComplete = (exerciseIndex: number, setIndex: number) => {
    const exercise = draft[exerciseIndex];
    const set = exercise.sets[setIndex];
    const completing = set.status !== 'completed';
    updateSet(exerciseIndex, setIndex, { status: completing ? 'completed' : 'pending' });
    if (!completing && restTimer?.exerciseIndex === exerciseIndex) {
      setRestTimer(null);
      return;
    }
    const anotherSetRemains = exercise.sets.slice(setIndex + 1).some((candidate) => candidate.status === 'pending');
    if (completing && anotherSetRemains && exercise.restSecondsBetweenSets > 0) {
      setRestTimer({ exerciseIndex, remainingSeconds: exercise.restSecondsBetweenSets });
    }
  };

  const formatRestTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  const toggleExercise = (exerciseIndex: number) => {
    setDraft((current) => current.map((exercise, index) => index !== exerciseIndex ? exercise : {
      ...exercise,
      skipped: !exercise.skipped,
      sets: exercise.sets.map((set) => ({ ...set, status: !exercise.skipped ? 'skipped' : 'pending' }))
    }));
  };

  const finish = async () => {
    if (!workout || !profile || saving) return;
    setSaving(true);
    const completedAt = new Date().toISOString();
    const exercises = draft.map((exercise) => ({
      prescriptionId: exercise.id,
      exerciseId: exercise.exerciseId,
      name: exercise.name,
      kind: exercise.kind,
      variation: exercise.variation,
      prescribedSets: workout.exercises.find((item) => item.id === exercise.id)?.sets ?? [],
      completedSets: exercise.sets.map((set) => ({
        id: set.id,
        targetReps: set.targetReps,
        targetLoadLb: set.targetLoadLb,
        targetAssistanceLb: set.targetAssistanceLb,
        perSide: set.perSide,
        actualReps: set.status === 'completed' ? set.actualReps : 0,
        actualLoadLb: set.actualLoadLb,
        actualAssistanceLb: set.actualAssistanceLb,
        status: set.status === 'completed' ? 'completed' as const : 'skipped' as const,
        notes: exercise.notes || undefined
      })),
      skipped: exercise.skipped,
      notes: exercise.notes || undefined,
      restSecondsBetweenSets: exercise.restSecondsBetweenSets
    }));
    const completedSets = exercises.flatMap((exercise) => exercise.completedSets);
    const completedCount = completedSets.filter((set) => set.status === 'completed').length;
    const resultBase: BuildWorkoutResult = {
      id: `result-${workout.id}-${Date.parse(completedAt) || Date.now()}`,
      workoutId: workout.id,
      source: 'BUILD',
      title: workout.title,
      templateId: workout.templateId,
      scheduledDay: workout.scheduledDay,
      startedAt,
      completedAt,
      status: completedCount === 0 ? 'skipped' : completedCount === completedSets.length ? 'completed' : 'partial',
      exercises,
      progressionSummary: []
    };
    const progressionSummary = getProgressionSummaries(profile, resultBase);
    const result = { ...resultBase, progressionSummary };
    const nextProfile = advanceBuildProfile(profile, result);
    await Promise.all([saveBuildProfile(nextProfile), appendWorkoutHistory(result), saveActiveBuildWorkout(null)]);
    setSummary(progressionSummary.length ? progressionSummary : ['Workout recorded. Your next scheduled session is ready when you are.']);
    setSaving(false);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={theme.colors.lime} /></View>;
  if (!workout || !profile) return <View style={styles.center}><Text style={styles.body}>No active BUILD workout.</Text><TouchableOpacity style={styles.primary} onPress={() => router.replace('/')}><Text style={styles.primaryText}>Go to Today</Text></TouchableOpacity></View>;
  if (summary) return <ScrollView style={styles.container} contentContainerStyle={styles.content}><Text style={styles.kicker}>SESSION RECORDED</Text><Text style={styles.title}>Good work. Keep it repeatable.</Text><View style={styles.summaryCard}>{summary.map((line) => <Text key={line} style={styles.summaryLine}>{line}</Text>)}</View><Text style={styles.body}>Progress is based on what you recorded. A partial session never triggers an aggressive jump.</Text><TouchableOpacity style={styles.primary} onPress={() => router.replace('/')}><Text style={styles.primaryText}>See Next Workout</Text></TouchableOpacity></ScrollView>;

  const doneCount = draft.flatMap((exercise) => exercise.sets).filter((set) => set.status !== 'pending').length;
  const totalCount = draft.flatMap((exercise) => exercise.sets).length;

  return <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.header}><View><Text style={styles.kicker}>{workout.scheduledDay.toUpperCase()} · BUILD</Text><Text style={styles.title}>{workout.title}</Text></View><Text style={styles.counter}>{doneCount}/{totalCount} sets</Text></View>
    <Text style={styles.body}>Targets stay visible. Adjust the actual value, then mark each set complete. Planned values are preserved separately.</Text>
    {draft.map((exercise, exerciseIndex) => <View key={exercise.id} style={[styles.exerciseCard, exercise.skipped && styles.skippedCard]}>
      <View style={styles.exerciseHeader}><View style={styles.exerciseCopy}><Text style={styles.exerciseName}>{exercise.name}</Text><Text style={styles.progression}>{exercise.progressionLabel}</Text></View><TouchableOpacity onPress={() => toggleExercise(exerciseIndex)}><Text style={styles.skipText}>{exercise.skipped ? 'Restore' : 'Skip exercise'}</Text></TouchableOpacity></View>
      <Text style={styles.restPrescription}>{exercise.restSecondsBetweenSets ? `Rest ${formatRestTime(exercise.restSecondsBetweenSets)} between sets` : 'Single assessment set'}</Text><Text style={styles.cue}>{exercise.cue}</Text>
      {restTimer?.exerciseIndex === exerciseIndex ? <View style={[styles.restBanner, restTimer.remainingSeconds === 0 && styles.restComplete]}><View style={styles.restCopy}><Text style={styles.restKicker}>{restTimer.remainingSeconds === 0 ? 'REST COMPLETE' : 'RESTING'}</Text><Text style={styles.restExercise}>{exercise.name}</Text></View><Text style={styles.restTime}>{formatRestTime(restTimer.remainingSeconds)}</Text><View style={styles.restActions}><TouchableOpacity onPress={() => setRestTimer((current) => current ? { ...current, remainingSeconds: current.remainingSeconds + 30 } : null)}><Text style={styles.restAction}>+30s</Text></TouchableOpacity><TouchableOpacity onPress={() => setRestTimer(null)}><Text style={styles.restAction}>{restTimer.remainingSeconds === 0 ? 'Done' : 'Skip rest'}</Text></TouchableOpacity></View></View> : null}
      {!exercise.skipped ? exercise.sets.map((set, setIndex) => <View key={set.id} style={[styles.setRow, set.status === 'completed' && styles.completedSet, set.status === 'skipped' && styles.skippedSet]}>
        <View style={styles.setTopline}><Text style={styles.setName}>Set {setIndex + 1}</Text><Text style={styles.target}>Target {set.targetReps}{set.perSide ? ' / side' : ''}</Text></View>
        <View style={styles.steppers}><Stepper label="Reps" value={set.actualReps} onChange={(value) => updateSet(exerciseIndex, setIndex, { actualReps: value })} />{set.actualAssistanceLb !== undefined ? <Stepper label="Assist lb" value={set.actualAssistanceLb} step={profile.pullup.assistanceIncrementLb} onChange={(value) => updateSet(exerciseIndex, setIndex, { actualAssistanceLb: value })} /> : null}{set.actualLoadLb !== undefined ? <Stepper label="Load lb" value={set.actualLoadLb} step={5} onChange={(value) => updateSet(exerciseIndex, setIndex, { actualLoadLb: value })} /> : null}</View>
        <View style={styles.setActions}><TouchableOpacity style={[styles.completeButton, set.status === 'completed' && styles.completeButtonActive]} onPress={() => toggleSetComplete(exerciseIndex, setIndex)}><Text style={[styles.completeText, set.status === 'completed' && styles.completeTextActive]}>{set.status === 'completed' ? '✓ Complete' : 'Complete set'}</Text></TouchableOpacity><TouchableOpacity onPress={() => updateSet(exerciseIndex, setIndex, { status: set.status === 'skipped' ? 'pending' : 'skipped' })}><Text style={styles.skipText}>{set.status === 'skipped' ? 'Restore' : 'Skip'}</Text></TouchableOpacity></View>
      </View>) : null}
      {!exercise.skipped ? <TextInput accessibilityLabel={`${exercise.name} notes`} placeholder="Optional notes" placeholderTextColor={theme.colors.textSubtle} value={exercise.notes} onChangeText={(notes) => setDraft((current) => current.map((item, index) => index === exerciseIndex ? { ...item, notes } : item))} style={styles.notes} /> : null}
    </View>)}
    <TouchableOpacity disabled={saving} style={[styles.primary, saving && styles.disabled]} onPress={finish}><Text style={styles.primaryText}>{saving ? 'Saving…' : doneCount === 0 ? 'Skip & Record Workout' : 'COMPLETE WORKOUT'}</Text></TouchableOpacity>
    {doneCount < totalCount && doneCount > 0 ? <Text style={styles.partialNote}>Unmarked sets will be saved as skipped. Partial work is still useful information.</Text> : null}
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background }, content: { padding: 18, gap: 14, paddingBottom: 48, maxWidth: 760, width: '100%', alignSelf: 'center' }, center: { flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }, kicker: { color: theme.colors.purple, fontSize: 12, fontWeight: '900', letterSpacing: 1 }, title: { color: theme.colors.text, fontSize: 30, fontWeight: '900' }, counter: { color: theme.colors.ink, backgroundColor: theme.colors.lime, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, overflow: 'hidden', fontWeight: '900' }, body: { color: theme.colors.textMuted, lineHeight: 21 },
  restBanner: { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.purple, borderWidth: 1, borderRadius: 10, padding: 14, gap: 10, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }, restComplete: { borderColor: theme.colors.lime }, restCopy: { flex: 1, minWidth: 140 }, restKicker: { color: theme.colors.purple, fontSize: 11, fontWeight: '900' }, restExercise: { color: theme.colors.textSoft, fontWeight: '800' }, restTime: { color: theme.colors.lime, fontSize: 30, fontWeight: '900' }, restActions: { flexDirection: 'row', gap: 12, width: '100%', justifyContent: 'flex-end' }, restAction: { color: theme.colors.textSoft, fontWeight: '800', padding: 5 },
  exerciseCard: { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderMuted, borderWidth: 1, borderRadius: 10, padding: 15, gap: 12 }, skippedCard: { opacity: 0.55 }, exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 }, exerciseCopy: { flex: 1, gap: 3 }, exerciseName: { color: theme.colors.text, fontSize: 20, fontWeight: '900' }, progression: { color: theme.colors.lime, fontWeight: '700', textTransform: 'capitalize' }, restPrescription: { color: theme.colors.purple, fontSize: 13, fontWeight: '900' }, cue: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 18 },
  setRow: { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.borderMuted, borderWidth: 1, borderRadius: 8, padding: 12, gap: 11 }, completedSet: { borderColor: theme.colors.lime }, skippedSet: { opacity: 0.45 }, setTopline: { flexDirection: 'row', justifyContent: 'space-between' }, setName: { color: theme.colors.text, fontWeight: '900' }, target: { color: theme.colors.textSoft, fontWeight: '700' }, steppers: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, stepper: { gap: 5 }, stepperLabel: { color: theme.colors.textSubtle, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }, stepperControls: { flexDirection: 'row', alignItems: 'center', borderColor: theme.colors.border, borderWidth: 1, borderRadius: 7, overflow: 'hidden' }, stepButton: { paddingHorizontal: 13, paddingVertical: 8, backgroundColor: theme.colors.surface }, stepText: { color: theme.colors.text, fontSize: 20, fontWeight: '900' }, stepValue: { color: theme.colors.text, minWidth: 38, textAlign: 'center', fontWeight: '900' },
  setActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, completeButton: { borderColor: theme.colors.border, borderWidth: 1, borderRadius: 7, paddingHorizontal: 13, paddingVertical: 9 }, completeButtonActive: { backgroundColor: theme.colors.lime, borderColor: theme.colors.lime }, completeText: { color: theme.colors.textSoft, fontWeight: '900' }, completeTextActive: { color: theme.colors.ink }, skipText: { color: theme.colors.textSubtle, fontSize: 12, fontWeight: '700', padding: 6 }, notes: { color: theme.colors.text, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 7, padding: 11 },
  primary: { backgroundColor: theme.colors.lime, padding: 16, borderRadius: 8, alignItems: 'center' }, primaryText: { color: theme.colors.ink, fontSize: 16, fontWeight: '900' }, disabled: { opacity: 0.5 }, partialNote: { color: theme.colors.textSubtle, textAlign: 'center', fontSize: 12 }, summaryCard: { backgroundColor: theme.colors.surface, borderColor: theme.colors.lime, borderWidth: 1, borderRadius: 10, padding: 18, gap: 12 }, summaryLine: { color: theme.colors.text, fontSize: 17, lineHeight: 24, fontWeight: '800' }
});
