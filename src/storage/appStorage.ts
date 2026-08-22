import AsyncStorage from '@react-native-async-storage/async-storage';
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

export function loadBuildProfile(): Promise<BuildProfile | null> {
  return readJson<BuildProfile>(KEYS.profile);
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
