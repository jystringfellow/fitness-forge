import AsyncStorage from '@react-native-async-storage/async-storage';
import { clampPushupGoal, createBuildWorkout, DEFAULT_BUILD_REST_PREFERENCES } from '@/data/buildProgram';
import { getInitialPushupProgramWeek, selectPushupBracket } from '@/data/pushupProgram';
import { BuildProfile, BuildWorkoutPrescription, WorkoutHistoryEntry } from '@/types/build';
import { WorkoutPlan } from '@/types/workout';
import { MAX_LOCAL_HISTORY } from '@/lib/cloudMerge';
import { getNextPullupState } from '@/lib/pullupProgression';
import { getNextPushupState } from '@/lib/pushupProgression';
import { markCloudDataDirty } from '@/storage/cloudMetadata';
import { ForgeSetResult, loadForgeSetResults } from '@/storage/workoutStorage';
import { CompletedExercise } from '@/types/build';

const KEYS = {
  profile: 'fitness_forge/build_profile_v1',
  activeBuildWorkout: 'fitness_forge/active_build_workout_v1',
  history: 'fitness_forge/workout_history_v1',
  currentForgeWorkout: 'fitness_forge/current_workout'
} as const;

async function readJson<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function migrateBuildProfile(value: unknown): BuildProfile | null {
  if (!value || typeof value !== 'object') return null;
  const profile = value as Record<string, unknown>;
  const pushup = profile.pushup as Record<string, unknown> | undefined;
  if (!pushup) return null;
  if (profile.schemaVersion === 5 && typeof pushup.programWeek === 'number' && typeof pushup.goalReps === 'number' && Array.isArray(profile.bodyWeightHistory) && profile.rest) return value as BuildProfile;

  let migratedPushup = pushup;
  if (typeof pushup.programWeek !== 'number') {
    const sessionIndex = typeof pushup.programSessionIndex === 'number' ? pushup.programSessionIndex : 0;
    const assessmentDue = pushup.assessmentDue === true;
    const baselineMax = typeof pushup.baselineMax === 'number' ? pushup.baselineMax : 1;
    const programWeek = assessmentDue
      ? 2
      : sessionIndex === 0
        ? getInitialPushupProgramWeek(baselineMax)
        : Math.min(2, Math.floor(sessionIndex / 3) + 1);
    const programDay = assessmentDue ? 3 : (sessionIndex % 3) + 1;
    migratedPushup = {
      ...pushup,
      baselineMax,
      programWeek,
      programDay,
      programBracket: selectPushupBracket(programWeek, baselineMax).id,
      assessmentReason: assessmentDue ? 'phase' : undefined,
      nextProgramWeekAfterAssessment: assessmentDue ? 3 : undefined
    };
  }

  return {
    ...(value as Omit<BuildProfile, 'schemaVersion' | 'pushup' | 'rest'>),
    schemaVersion: 5,
    bodyWeightHistory: Array.isArray(profile.bodyWeightHistory) ? profile.bodyWeightHistory : [],
    pullup: {
      ...(profile.pullup as BuildProfile['pullup']),
      successfulSessionsAtCurrentAssistance: typeof (profile.pullup as Record<string, unknown> | undefined)?.successfulSessionsAtCurrentAssistance === 'number'
        ? (profile.pullup as BuildProfile['pullup']).successfulSessionsAtCurrentAssistance
        : 0
    },
    pushup: { ...migratedPushup, goalReps: clampPushupGoal(typeof migratedPushup.goalReps === 'number' ? migratedPushup.goalReps : 50) } as unknown as BuildProfile['pushup'],
    rest: {
      ...DEFAULT_BUILD_REST_PREFERENCES,
      ...(profile.rest as Partial<BuildProfile['rest']> | undefined)
    }
  } as BuildProfile;
}

export async function loadBuildProfile(): Promise<BuildProfile | null> {
  const stored = await readJson<unknown>(KEYS.profile);
  const migrated = migrateBuildProfile(stored);
  if (migrated && (stored as { schemaVersion?: number } | null)?.schemaVersion !== 5) {
    await Promise.all([
      saveBuildProfile(migrated),
      AsyncStorage.removeItem(KEYS.activeBuildWorkout)
    ]);
  }
  if (!migrated) return null;
  const history = await loadWorkoutHistory();
  const applied = new Set(migrated.appliedForgeWorkoutIds ?? []);
  const appliedTemplates = new Set(migrated.appliedForgeTemplateWorkoutIds ?? []);
  let current = migrated;
  for (const entry of [...history].reverse()) {
    if (entry.source !== 'FORGE' || !entry.linkedExercises?.length || Date.parse(entry.completedAt) < Date.parse(migrated.createdAt)) continue;
    if (!applied.has(entry.id)) {
      current = advanceLinkedCapabilities(current, entry.linkedExercises, entry.completedAt);
      applied.add(entry.id);
    }
    if (!appliedTemplates.has(entry.id) && completesLinkedBuildSession(current, entry.linkedExercises)) {
      current = { ...current, nextTemplateIndex: (current.nextTemplateIndex + 1) % 3 };
      appliedTemplates.add(entry.id);
    }
  }
  if (applied.size !== (migrated.appliedForgeWorkoutIds ?? []).length
    || appliedTemplates.size !== (migrated.appliedForgeTemplateWorkoutIds ?? []).length) {
    current = { ...current, appliedForgeWorkoutIds: [...applied].slice(-MAX_LOCAL_HISTORY),
      appliedForgeTemplateWorkoutIds: [...appliedTemplates].slice(-MAX_LOCAL_HISTORY) };
    await saveBuildProfile(current);
  }
  return current;
}

function completesLinkedBuildSession(profile: BuildProfile, exercises: CompletedExercise[]): boolean {
  const requiredKinds = [profile.pullup.enabled && 'pull-up', profile.pushup.enabled && 'push-up'].filter(Boolean);
  return profile.active && requiredKinds.length > 0
    && requiredKinds.every((kind) => exercises.some((exercise) => exercise.kind === kind))
    && exercises.some((exercise) => requiredKinds.includes(exercise.kind)
      && exercise.completedSets.some((set) => set.status === 'completed'));
}

function advanceLinkedCapabilities(profile: BuildProfile, exercises: CompletedExercise[], completedAt: string): BuildProfile {
  let next = { ...profile, updatedAt: completedAt };
  const pullup = exercises.find((item) => item.kind === 'pull-up' && item.completedSets.some((set) => set.status === 'completed') && matchesCurrentCapability(profile, item));
  const pushup = exercises.find((item) => item.kind === 'push-up' && item.completedSets.some((set) => set.status === 'completed') && matchesCurrentCapability(profile, item));
  if (pullup && next.pullup.enabled) next = { ...next, pullup: getNextPullupState(next.pullup, pullup, completedAt).state };
  if (pushup && next.pushup.enabled) next = { ...next, pushup: getNextPushupState(next.pushup, pushup, completedAt).state };
  return next;
}

function matchesCurrentCapability(profile: BuildProfile, exercise: CompletedExercise): boolean {
  if (exercise.kind === 'pull-up') {
    return exercise.variation === (profile.pullup.currentAssistanceLb === 0 ? 'unassisted' : 'assisted')
      && JSON.stringify(exercise.prescribedSets.map((set) => set.targetReps)) === JSON.stringify(profile.pullup.targetReps)
      && exercise.prescribedSets.every((set) => (set.targetAssistanceLb ?? 0) === profile.pullup.currentAssistanceLb);
  }
  if (exercise.kind === 'push-up') {
    const current = createBuildWorkout(profile).exercises.find((item) => item.kind === 'push-up');
    return Boolean(current && exercise.variation === current.variation
      && JSON.stringify(exercise.prescribedSets.map((set) => [set.targetReps, set.targetType]))
        === JSON.stringify(current.sets.map((set) => [set.targetReps, set.targetType])));
  }
  return false;
}

export async function saveBuildProfile(profile: BuildProfile): Promise<void> {
  await AsyncStorage.setItem(KEYS.profile, JSON.stringify(profile));
  await markCloudDataDirty();
}

export async function saveRecalculatedBuild(profile: BuildProfile): Promise<void> {
  const workout = createBuildWorkout(profile);
  await AsyncStorage.multiSet([
    [KEYS.profile, JSON.stringify(profile)],
    [KEYS.activeBuildWorkout, JSON.stringify(workout)]
  ]);
  await markCloudDataDirty();
}

export async function loadActiveBuildWorkout(): Promise<BuildWorkoutPrescription | null> {
  const workout = await readJson<BuildWorkoutPrescription>(KEYS.activeBuildWorkout);
  if (workout?.exercises.some((exercise) => exercise.kind === 'assessment')) {
    await AsyncStorage.removeItem(KEYS.activeBuildWorkout);
    return null;
  }
  if (workout) {
    const profile = await loadBuildProfile();
    if (profile?.active) {
      const current = createBuildWorkout(profile, workout.createdAt);
      if (JSON.stringify(current) !== JSON.stringify(workout)) {
        await saveActiveBuildWorkout(current);
        return current;
      }
    }
  }
  return workout;
}

export async function saveActiveBuildWorkout(workout: BuildWorkoutPrescription | null): Promise<void> {
  if (!workout) {
    await AsyncStorage.removeItem(KEYS.activeBuildWorkout);
    await markCloudDataDirty();
    return;
  }
  await AsyncStorage.setItem(KEYS.activeBuildWorkout, JSON.stringify(workout));
  await markCloudDataDirty();
}

export async function loadWorkoutHistory(): Promise<WorkoutHistoryEntry[]> {
  return (await readJson<WorkoutHistoryEntry[]>(KEYS.history)) ?? [];
}

export async function appendWorkoutHistory(entry: WorkoutHistoryEntry): Promise<void> {
  const history = await loadWorkoutHistory();
  const next = prependUniqueHistory(history, entry);
  if (next === history) return;
  await AsyncStorage.setItem(KEYS.history, JSON.stringify(next));
  await markCloudDataDirty();
}

export function prependUniqueHistory(history: WorkoutHistoryEntry[], entry: WorkoutHistoryEntry): WorkoutHistoryEntry[] {
  if (history.some((item) => item.id === entry.id)) return history;
  return [entry, ...history].slice(0, MAX_LOCAL_HISTORY);
}

export async function recoverCompletedForgeWorkout(): Promise<void> {
  const plan = await readJson<WorkoutPlan>(KEYS.currentForgeWorkout);
  if (!plan?.intervalSteps?.length || plan.currentStepIndex !== plan.intervalSteps.length) return;
  if ((await loadWorkoutHistory()).some((entry) => entry.id === `forge-${plan.createdAt}`)) return;
  await recordForgeCompletion(plan, await loadForgeSetResults(plan.createdAt));
}

export async function recordForgeCompletion(plan: WorkoutPlan, setResults: ForgeSetResult[] = []): Promise<void> {
  const linkedExercises: CompletedExercise[] = (plan.linkedExercises ?? []).map((exercise) => ({
    prescriptionId: exercise.id,
    exerciseId: exercise.exerciseId,
    name: exercise.name,
    kind: exercise.kind,
    variation: exercise.variation,
    prescribedSets: exercise.sets,
    completedSets: exercise.sets.map((set, setIndex) => {
      const logged = setResults.find((item) => item.exerciseId === exercise.id && item.setIndex === setIndex);
      return { ...set, actualReps: logged?.status === 'completed' ? logged.actualReps : 0,
        actualAssistanceLb: logged?.actualAssistanceLb ?? set.targetAssistanceLb,
        status: logged?.status ?? 'skipped' as const };
    }),
    skipped: !exercise.sets.some((_, setIndex) => setResults.some((item) => item.exerciseId === exercise.id && item.setIndex === setIndex && item.status === 'completed')),
    restSecondsBetweenSets: plan.mainBlock.restSeconds,
    programContext: exercise.programContext
  }));
  const profile = linkedExercises.length ? await loadBuildProfile() : null;
  const progressionSummary = profile ? linkedExercises.flatMap((exercise) => {
    if (!exercise.completedSets.some((set) => set.status === 'completed')) return [];
    if (!matchesCurrentCapability(profile, exercise)) return [`${exercise.name}: saved targets changed during this workout. Results were recorded; review them in Recalculate BUILD.`];
    if (exercise.kind === 'pull-up' && profile.pullup.enabled) return [getNextPullupState(profile.pullup, exercise, new Date().toISOString()).summary];
    if (exercise.kind === 'push-up' && profile.pushup.enabled) return [getNextPushupState(profile.pushup, exercise, new Date().toISOString()).summary];
    return [];
  }) : [];
  await appendWorkoutHistory({
    id: `forge-${plan.createdAt}`,
    source: 'FORGE',
    title: plan.title,
    completedAt: new Date().toISOString(),
    durationMinutes: plan.input.time,
    focus: plan.input.focus,
    exerciseNames: plan.mainBlock.exercises.map((exercise) => exercise.name),
    linkedExercises: linkedExercises.length ? linkedExercises : undefined,
    progressionSummary: progressionSummary.length ? progressionSummary : undefined
  });
  if (linkedExercises.length) await loadBuildProfile();
}

export async function resetBuildData(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(KEYS.profile),
    AsyncStorage.removeItem(KEYS.activeBuildWorkout)
  ]);
  await markCloudDataDirty();
}

export const STORAGE_KEYS = KEYS;
