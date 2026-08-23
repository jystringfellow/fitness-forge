import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_BUILD_REST_PREFERENCES } from '@/data/buildProgram';
import { getInitialPushupProgramWeek, selectPushupBracket } from '@/data/pushupProgram';
import { BuildProfile, BuildWorkoutPrescription, WorkoutHistoryEntry } from '@/types/build';
import { WorkoutPlan } from '@/types/workout';

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
  if (profile.schemaVersion === 3 && typeof pushup.programWeek === 'number' && profile.rest) return value as BuildProfile;

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
    schemaVersion: 3,
    pushup: migratedPushup as unknown as BuildProfile['pushup'],
    rest: {
      ...DEFAULT_BUILD_REST_PREFERENCES,
      ...(profile.rest as Partial<BuildProfile['rest']> | undefined)
    }
  } as BuildProfile;
}

export async function loadBuildProfile(): Promise<BuildProfile | null> {
  const stored = await readJson<unknown>(KEYS.profile);
  const migrated = migrateBuildProfile(stored);
  if (migrated && (stored as { schemaVersion?: number } | null)?.schemaVersion !== 3) {
    await Promise.all([
      saveBuildProfile(migrated),
      AsyncStorage.removeItem(KEYS.activeBuildWorkout)
    ]);
  }
  return migrated;
}

export async function saveBuildProfile(profile: BuildProfile): Promise<void> {
  await AsyncStorage.setItem(KEYS.profile, JSON.stringify(profile));
}

export function loadActiveBuildWorkout(): Promise<BuildWorkoutPrescription | null> {
  return readJson<BuildWorkoutPrescription>(KEYS.activeBuildWorkout);
}

export async function saveActiveBuildWorkout(workout: BuildWorkoutPrescription | null): Promise<void> {
  if (!workout) {
    await AsyncStorage.removeItem(KEYS.activeBuildWorkout);
    return;
  }
  await AsyncStorage.setItem(KEYS.activeBuildWorkout, JSON.stringify(workout));
}

export async function loadWorkoutHistory(): Promise<WorkoutHistoryEntry[]> {
  return (await readJson<WorkoutHistoryEntry[]>(KEYS.history)) ?? [];
}

export async function appendWorkoutHistory(entry: WorkoutHistoryEntry): Promise<void> {
  const history = await loadWorkoutHistory();
  const next = prependUniqueHistory(history, entry);
  if (next === history) return;
  await AsyncStorage.setItem(KEYS.history, JSON.stringify(next));
}

export function prependUniqueHistory(history: WorkoutHistoryEntry[], entry: WorkoutHistoryEntry): WorkoutHistoryEntry[] {
  if (history.some((item) => item.id === entry.id)) return history;
  return [entry, ...history].slice(0, 250);
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
}

export const STORAGE_KEYS = KEYS;
