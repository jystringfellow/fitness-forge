import AsyncStorage from '@react-native-async-storage/async-storage';
import { clampPushupGoal, createBuildWorkout, DEFAULT_BUILD_REST_PREFERENCES } from '@/data/buildProgram';
import { getInitialPushupProgramWeek, selectPushupBracket } from '@/data/pushupProgram';
import { BuildProfile, BuildWorkoutPrescription, WorkoutHistoryEntry } from '@/types/build';
import { WorkoutPlan } from '@/types/workout';
import { MAX_LOCAL_HISTORY } from '@/lib/cloudMerge';
import { markCloudDataDirty } from '@/storage/cloudMetadata';

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
  return migrated;
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

export async function recordForgeCompletion(plan: WorkoutPlan): Promise<void> {
  await appendWorkoutHistory({
    id: `forge-${plan.createdAt}`,
    source: 'FORGE',
    title: plan.title,
    completedAt: new Date().toISOString(),
    durationMinutes: plan.input.time,
    focus: plan.input.focus,
    exerciseNames: plan.mainBlock.exercises.map((exercise) => exercise.name)
  });
}

export async function resetBuildData(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(KEYS.profile),
    AsyncStorage.removeItem(KEYS.activeBuildWorkout)
  ]);
  await markCloudDataDirty();
}

export const STORAGE_KEYS = KEYS;
