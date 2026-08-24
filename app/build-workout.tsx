import { useEffect, useRef, useState } from 'react';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useWorkoutWakeLock } from '@/hooks/useWorkoutWakeLock';
import { advanceBuildProfile, getProgressionSummaries } from '@/lib/buildProgression';
import { getLastCompletedSetPosition, getPendingSetPositions, getRestAudioCue, SetPosition } from '@/lib/buildWorkoutFlow';
import { appendWorkoutHistory, loadActiveBuildWorkout, loadBuildProfile, saveActiveBuildWorkout, saveBuildProfile } from '@/storage/appStorage';
import { theme } from '@/theme/brand';
import { BuildProfile, BuildWorkoutPrescription, BuildWorkoutResult, ExercisePrescription, SetStatus } from '@/types/build';

const restChime = require('../assets/timer-switch.wav');

interface DraftSet {
  id: string;
  targetReps: number;
  targetLoadLb?: number;
  targetAssistanceLb?: number;
  perSide?: boolean;
  targetType?: 'fixed' | 'minimum';
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
  paused: boolean;
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

function formatRestTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
}

function setTarget(exercise: DraftExercise, setIndex: number): string {
  const set = exercise.sets[setIndex];
  const reps = `${set.targetReps}${set.targetType === 'minimum' ? '+' : ''}${set.perSide ? ' / side' : ''}`;
  if (set.targetAssistanceLb !== undefined) return `${reps} reps · ${set.targetAssistanceLb} lb assist`;
  if (set.targetLoadLb !== undefined) return `${reps} reps · ${set.targetLoadLb} lb`;
  return `${reps} reps`;
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
  const restPlayer = useAudioPlayer(restChime);
  const playedCueSecondRef = useRef<number | null>(null);

  useWorkoutWakeLock(Boolean(workout && profile && !summary), 'fitness-forge-build-workout');

  useEffect(() => {
    const load = async () => {
      const savedProfile = await loadBuildProfile();
      const savedWorkout = await loadActiveBuildWorkout();
      setWorkout(savedWorkout);
      setProfile(savedProfile);
      if (savedWorkout) setDraft(makeDraft(savedWorkout));
      setLoading(false);
    };
    load().catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    restPlayer.volume = 0.35;
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {
      // Audio cues are helpful but never allowed to block the workout.
    });
  }, [restPlayer]);

  useEffect(() => {
    if (!restTimer || restTimer.paused || restTimer.remainingSeconds <= 0) return;
    const timeout = setTimeout(() => {
      setRestTimer((current) => current ? { ...current, remainingSeconds: Math.max(0, current.remainingSeconds - 1) } : null);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [restTimer]);

  useEffect(() => {
    if (!restTimer) {
      playedCueSecondRef.current = null;
      return;
    }
    const cue = getRestAudioCue(restTimer.remainingSeconds, restTimer.paused);
    if (!cue || playedCueSecondRef.current === restTimer.remainingSeconds) return;
    playedCueSecondRef.current = restTimer.remainingSeconds;
    restPlayer.volume = cue === 'start' ? 0.9 : 0.35;
    restPlayer.seekTo(0).then(() => restPlayer.play()).catch(() => {
      // The visual countdown remains authoritative if playback is unavailable.
    });
    if (cue === 'start') {
      const timeout = setTimeout(() => {
        setRestTimer((current) => current?.remainingSeconds === 0 ? null : current);
      }, 900);
      return () => clearTimeout(timeout);
    }
  }, [restPlayer, restTimer]);

  const updateSet = (exerciseIndex: number, setIndex: number, update: Partial<DraftSet>) => {
    setDraft((current) => current.map((exercise, index) => index !== exerciseIndex ? exercise : {
      ...exercise,
      sets: exercise.sets.map((set, innerIndex) => innerIndex === setIndex ? { ...set, ...update } : set)
    }));
  };

  const updateNotes = (exerciseIndex: number, notes: string) => {
    setDraft((current) => current.map((exercise, index) => index === exerciseIndex ? { ...exercise, notes } : exercise));
  };

  const completeSet = ({ exerciseIndex, setIndex }: SetPosition) => {
    const exercise = draft[exerciseIndex];
    updateSet(exerciseIndex, setIndex, { status: 'completed' });
    const anotherSetRemains = exercise.sets.slice(setIndex + 1).some((candidate) => candidate.status === 'pending');
    if (anotherSetRemains && exercise.restSecondsBetweenSets > 0) {
      playedCueSecondRef.current = null;
      setRestTimer({ exerciseIndex, remainingSeconds: exercise.restSecondsBetweenSets, paused: false });
    }
  };

  const skipRemainingExercise = (exerciseIndex: number) => {
    setRestTimer(null);
    setDraft((current) => current.map((exercise, index) => {
      if (index !== exerciseIndex) return exercise;
      const hasCompletedSet = exercise.sets.some((set) => set.status === 'completed');
      return {
        ...exercise,
        skipped: !hasCompletedSet,
        sets: exercise.sets.map((set) => set.status === 'pending' ? { ...set, status: 'skipped' as const } : set)
      };
    }));
  };

  const restoreLastCompletedSet = () => {
    const previous = getLastCompletedSetPosition(draft);
    if (!previous) return;
    setRestTimer(null);
    updateSet(previous.exerciseIndex, previous.setIndex, { status: 'pending' });
  };

  const restoreSet = ({ exerciseIndex, setIndex }: SetPosition) => {
    setRestTimer(null);
    setDraft((current) => current.map((exercise, index) => index !== exerciseIndex ? exercise : {
      ...exercise,
      skipped: false,
      sets: exercise.sets.map((set, innerIndex) => innerIndex === setIndex ? { ...set, status: 'pending' } : set)
    }));
  };

  const finish = async () => {
    if (!workout || !profile || saving) return;
    setSaving(true);
    setRestTimer(null);
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
        targetType: set.targetType,
        actualReps: set.status === 'completed' ? set.actualReps : 0,
        actualLoadLb: set.actualLoadLb,
        actualAssistanceLb: set.actualAssistanceLb,
        status: set.status === 'completed' ? 'completed' as const : 'skipped' as const,
        notes: exercise.notes || undefined
      })),
      skipped: exercise.skipped,
      notes: exercise.notes || undefined,
      restSecondsBetweenSets: exercise.restSecondsBetweenSets,
      programContext: exercise.programContext
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

  const pendingPositions = getPendingSetPositions(draft);
  const currentPosition = pendingPositions[0] ?? null;
  const nextPosition = pendingPositions[1] ?? null;
  const currentExercise = currentPosition ? draft[currentPosition.exerciseIndex] : null;
  const currentSet = currentPosition && currentExercise ? currentExercise.sets[currentPosition.setIndex] : null;
  const completedCount = draft.flatMap((exercise) => exercise.sets).filter((set) => set.status === 'completed').length;
  const totalCount = draft.flatMap((exercise) => exercise.sets).length;
  const lastCompleted = getLastCompletedSetPosition(draft);

  const preview = (() => {
    if (restTimer && currentPosition && currentExercise) {
      return `${currentExercise.name} · Set ${currentPosition.setIndex + 1} · ${setTarget(currentExercise, currentPosition.setIndex)}`;
    }
    if (!currentPosition || !currentExercise || !nextPosition) return 'Complete and save the workout';
    const nextExercise = draft[nextPosition.exerciseIndex];
    const nextSetText = `${nextExercise.name} · Set ${nextPosition.setIndex + 1} · ${setTarget(nextExercise, nextPosition.setIndex)}`;
    return nextPosition.exerciseIndex === currentPosition.exerciseIndex && currentExercise.restSecondsBetweenSets > 0
      ? `Rest ${formatRestTime(currentExercise.restSecondsBetweenSets)}, then ${nextSetText}`
      : nextSetText;
  })();

  return <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.header}><View><Text style={styles.kicker}>{workout.scheduledDay.toUpperCase()} · BUILD</Text><Text style={styles.title}>{workout.title}</Text></View><Text style={styles.counter}>{completedCount}/{totalCount}</Text></View>

    {restTimer ? <View style={[styles.focusCard, styles.restCard, restTimer.remainingSeconds <= 5 && styles.restEnding]}>
      <Text style={styles.focusKicker}>{restTimer.remainingSeconds === 0 ? 'START' : restTimer.paused ? 'REST PAUSED' : restTimer.remainingSeconds <= 5 ? 'GET READY' : 'REST'}</Text>
      <Text accessibilityLiveRegion="polite" style={styles.restTime}>{formatRestTime(restTimer.remainingSeconds)}</Text>
      <Text style={styles.restExercise}>Longer is always available if your form or breathing needs it.</Text>
      <View style={styles.restActions}>
        {restTimer.remainingSeconds > 0 ? <TouchableOpacity style={styles.secondaryButton} onPress={() => setRestTimer((current) => current ? { ...current, paused: !current.paused } : null)}><Text style={styles.secondaryText}>{restTimer.paused ? 'Resume' : 'Pause'}</Text></TouchableOpacity> : null}
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setRestTimer((current) => current ? { ...current, remainingSeconds: current.remainingSeconds + 30 } : null)}><Text style={styles.secondaryText}>+30 sec</Text></TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setRestTimer(null)}><Text style={styles.secondaryText}>Skip rest</Text></TouchableOpacity>
      </View>
    </View> : currentPosition && currentExercise && currentSet ? <View style={styles.focusCard}>
      <View style={styles.focusTopline}><View style={styles.focusCopy}><Text style={styles.focusKicker}>NOW · SET {currentPosition.setIndex + 1} OF {currentExercise.sets.length}</Text><Text style={styles.exerciseName}>{currentExercise.name}</Text><Text style={styles.progression}>{currentExercise.progressionLabel}</Text></View><TouchableOpacity onPress={() => skipRemainingExercise(currentPosition.exerciseIndex)}><Text style={styles.skipText}>{currentPosition.setIndex === 0 ? 'Skip exercise' : 'Skip remaining'}</Text></TouchableOpacity></View>
      <View style={styles.targetBlock}><Text style={styles.targetLabel}>TARGET</Text><Text style={styles.targetValue}>{currentSet.targetReps}{currentSet.targetType === 'minimum' ? '+' : ''}{currentSet.perSide ? ' / side' : ''}</Text><Text style={styles.targetUnit}>reps{currentSet.targetAssistanceLb !== undefined ? ` · ${currentSet.targetAssistanceLb} lb assistance` : currentSet.targetLoadLb !== undefined ? ` · ${currentSet.targetLoadLb} lb` : ''}</Text></View>
      {currentSet.targetType === 'minimum' ? <Text style={styles.minimumCue}>Do at least {currentSet.targetReps} excellent reps. Continue only while form stays strong.</Text> : null}
      <Text style={styles.cue}>{currentExercise.cue}</Text>
      <View style={styles.steppers}><Stepper label="Actual reps" value={currentSet.actualReps} onChange={(value) => updateSet(currentPosition.exerciseIndex, currentPosition.setIndex, { actualReps: value })} />{currentSet.actualAssistanceLb !== undefined ? <Stepper label="Assist lb" value={currentSet.actualAssistanceLb} step={profile.pullup.assistanceIncrementLb} onChange={(value) => updateSet(currentPosition.exerciseIndex, currentPosition.setIndex, { actualAssistanceLb: value })} /> : null}{currentSet.actualLoadLb !== undefined ? <Stepper label="Load lb" value={currentSet.actualLoadLb} step={5} onChange={(value) => updateSet(currentPosition.exerciseIndex, currentPosition.setIndex, { actualLoadLb: value })} /> : null}</View>
      <TextInput accessibilityLabel={`${currentExercise.name} notes`} placeholder="Optional exercise notes" placeholderTextColor={theme.colors.textSubtle} value={currentExercise.notes} onChangeText={(notes) => updateNotes(currentPosition.exerciseIndex, notes)} style={styles.notes} />
      <View style={styles.setActions}><TouchableOpacity style={styles.primarySetButton} onPress={() => completeSet(currentPosition)}><Text style={styles.primaryText}>COMPLETE SET</Text></TouchableOpacity><TouchableOpacity style={styles.secondarySetButton} onPress={() => updateSet(currentPosition.exerciseIndex, currentPosition.setIndex, { status: 'skipped' })}><Text style={styles.secondaryText}>Skip set</Text></TouchableOpacity></View>
    </View> : <View style={[styles.focusCard, styles.readyCard]}><Text style={styles.focusKicker}>WORKOUT COMPLETE</Text><Text style={styles.exerciseName}>All sets are marked.</Text><Text style={styles.body}>Review the session map, then save your workout and calculate the next prescription.</Text></View>}

    <View style={styles.nextCard}><Text style={styles.nextKicker}>UP NEXT</Text><Text style={styles.nextText}>{preview}</Text></View>

    <View style={styles.sessionMap}><Text style={styles.mapTitle}>SESSION MAP · TAP A FINISHED SET TO EDIT</Text>{draft.map((exercise, exerciseIndex) => <View key={exercise.id} style={styles.mapRow}><Text style={styles.mapExercise}>{exercise.name}</Text><View style={styles.mapSets}>{exercise.sets.map((set, setIndex) => <TouchableOpacity accessibilityLabel={`${exercise.name} set ${setIndex + 1}, ${set.status}`} disabled={set.status === 'pending'} onPress={() => restoreSet({ exerciseIndex, setIndex })} key={set.id} style={[styles.mapSet, set.status === 'completed' && styles.mapSetComplete, set.status === 'skipped' && styles.mapSetSkipped, currentPosition?.exerciseIndex === exerciseIndex && currentPosition.setIndex === setIndex && styles.mapSetCurrent]}><Text style={[styles.mapSetText, set.status === 'completed' && styles.mapSetTextComplete]}>{set.status === 'completed' ? '✓' : set.status === 'skipped' ? '—' : setIndex + 1}</Text></TouchableOpacity>)}</View></View>)}</View>

    <View style={styles.footerActions}>{lastCompleted ? <TouchableOpacity onPress={restoreLastCompletedSet}><Text style={styles.undoText}>Undo last completed set</Text></TouchableOpacity> : null}<TouchableOpacity disabled={saving} style={[pendingPositions.length ? styles.finishEarly : styles.primary, saving && styles.disabled]} onPress={finish}><Text style={pendingPositions.length ? styles.finishEarlyText : styles.primaryText}>{saving ? 'Saving…' : pendingPositions.length ? 'Finish workout early' : 'SAVE WORKOUT'}</Text></TouchableOpacity></View>
    {pendingPositions.length > 0 && completedCount > 0 ? <Text style={styles.partialNote}>Finishing now saves every remaining set as skipped. Partial work is still useful information.</Text> : null}
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 18, gap: 14, paddingBottom: 48, maxWidth: 760, width: '100%', alignSelf: 'center' },
  center: { flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  kicker: { color: theme.colors.purple, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '900' },
  counter: { color: theme.colors.ink, backgroundColor: theme.colors.lime, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, overflow: 'hidden', fontWeight: '900' },
  body: { color: theme.colors.textMuted, lineHeight: 21 },
  focusCard: { backgroundColor: theme.colors.surface, borderColor: theme.colors.lime, borderWidth: 1, borderRadius: 12, padding: 18, gap: 14 },
  focusTopline: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  focusCopy: { flex: 1, gap: 4 },
  focusKicker: { color: theme.colors.lime, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  exerciseName: { color: theme.colors.text, fontSize: 25, fontWeight: '900' },
  progression: { color: theme.colors.textSoft, fontWeight: '700', textTransform: 'capitalize' },
  targetBlock: { alignItems: 'center', paddingVertical: 8 },
  targetLabel: { color: theme.colors.textSubtle, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  targetValue: { color: theme.colors.lime, fontSize: 64, lineHeight: 70, fontWeight: '900' },
  targetUnit: { color: theme.colors.textSoft, fontSize: 16, fontWeight: '800' },
  minimumCue: { color: theme.colors.purple, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  cue: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  steppers: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  stepper: { gap: 5 },
  stepperLabel: { color: theme.colors.textSubtle, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', textAlign: 'center' },
  stepperControls: { flexDirection: 'row', alignItems: 'center', borderColor: theme.colors.border, borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  stepButton: { paddingHorizontal: 17, paddingVertical: 11, backgroundColor: theme.colors.surfaceRaised },
  stepText: { color: theme.colors.text, fontSize: 22, fontWeight: '900' },
  stepValue: { color: theme.colors.text, minWidth: 48, textAlign: 'center', fontSize: 17, fontWeight: '900' },
  notes: { color: theme.colors.text, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 8, padding: 11 },
  setActions: { flexDirection: 'row', gap: 10 },
  primarySetButton: { flex: 1, backgroundColor: theme.colors.lime, padding: 16, borderRadius: 8, alignItems: 'center' },
  secondarySetButton: { borderColor: theme.colors.border, borderWidth: 1, paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center' },
  secondaryText: { color: theme.colors.textSoft, fontWeight: '900' },
  skipText: { color: theme.colors.textSubtle, fontSize: 12, fontWeight: '700', padding: 6 },
  restCard: { alignItems: 'center', borderColor: theme.colors.purple, paddingVertical: 24 },
  restEnding: { borderColor: theme.colors.lime },
  restTime: { color: theme.colors.lime, fontSize: 72, lineHeight: 80, fontWeight: '900', fontVariant: ['tabular-nums'] },
  restExercise: { color: theme.colors.textMuted, textAlign: 'center', lineHeight: 19 },
  restActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 9 },
  secondaryButton: { borderColor: theme.colors.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 11 },
  readyCard: { borderColor: theme.colors.lime },
  nextCard: { backgroundColor: theme.colors.surfaceRaised, borderLeftColor: theme.colors.purple, borderLeftWidth: 4, borderRadius: 8, padding: 14, gap: 5 },
  nextKicker: { color: theme.colors.purple, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  nextText: { color: theme.colors.text, fontSize: 15, lineHeight: 21, fontWeight: '800' },
  sessionMap: { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderMuted, borderWidth: 1, borderRadius: 10, padding: 13, gap: 10 },
  mapTitle: { color: theme.colors.textSubtle, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  mapRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  mapExercise: { color: theme.colors.textSoft, flex: 1, fontSize: 12, fontWeight: '700' },
  mapSets: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 5 },
  mapSet: { width: 25, height: 25, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderColor: theme.colors.border, borderWidth: 1 },
  mapSetCurrent: { borderColor: theme.colors.purple, borderWidth: 2 },
  mapSetComplete: { backgroundColor: theme.colors.lime, borderColor: theme.colors.lime },
  mapSetSkipped: { opacity: 0.35 },
  mapSetText: { color: theme.colors.textSoft, fontSize: 11, fontWeight: '900' },
  mapSetTextComplete: { color: theme.colors.ink },
  footerActions: { gap: 12, alignItems: 'center' },
  undoText: { color: theme.colors.textSubtle, fontSize: 12, fontWeight: '800', padding: 7 },
  primary: { width: '100%', backgroundColor: theme.colors.lime, padding: 16, borderRadius: 8, alignItems: 'center' },
  primaryText: { color: theme.colors.ink, fontSize: 15, fontWeight: '900' },
  finishEarly: { padding: 11 },
  finishEarlyText: { color: theme.colors.textSubtle, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  partialNote: { color: theme.colors.textSubtle, textAlign: 'center', fontSize: 12 },
  summaryCard: { backgroundColor: theme.colors.surface, borderColor: theme.colors.lime, borderWidth: 1, borderRadius: 10, padding: 18, gap: 12 },
  summaryLine: { color: theme.colors.text, fontSize: 17, lineHeight: 24, fontWeight: '800' }
});
