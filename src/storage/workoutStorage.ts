import AsyncStorage from '@react-native-async-storage/async-storage';
import { markCloudDataDirty } from '@/storage/cloudMetadata';
import { FixedStation, ForgeSetResult, WorkoutPlan } from '@/types/workout';

export type { ForgeSetResult } from '@/types/workout';

export const CURRENT_WORKOUT_KEY = 'fitness_forge/current_workout';
const FORGE_STATIONS_KEY = 'fitness_forge/fixed_stations_v1';
const FORGE_SET_RESULTS_KEY = 'fitness_forge/forge_set_results_v1';

export async function loadForgeSetResults(workoutId: string): Promise<ForgeSetResult[]> {
  try {
    const plan = await loadCurrentWorkout();
    if (plan?.createdAt === workoutId && plan.setResults?.length) return plan.setResults;
    const raw = await AsyncStorage.getItem(`${FORGE_SET_RESULTS_KEY}/${workoutId}`);
    if (raw) return JSON.parse(raw) as ForgeSetResult[];
    return [];
  } catch {
    return [];
  }
}

export async function saveForgeSetResults(workoutId: string, results: ForgeSetResult[]): Promise<void> {
  const plan = await loadCurrentWorkout();
  if (plan?.createdAt === workoutId) await AsyncStorage.setItem(CURRENT_WORKOUT_KEY, JSON.stringify({ ...plan, setResults: results }));
  await AsyncStorage.setItem(`${FORGE_SET_RESULTS_KEY}/${workoutId}`, JSON.stringify(results));
  await markCloudDataDirty();
}

export async function saveForgeStepIndex(workoutId: string, index: number): Promise<void> {
  const plan = await loadCurrentWorkout();
  if (plan?.createdAt !== workoutId) return;
  await AsyncStorage.setItem(CURRENT_WORKOUT_KEY, JSON.stringify({ ...plan, currentStepIndex: index }));
  await markCloudDataDirty();
}

export async function loadFixedStations(): Promise<FixedStation[]> {
  try {
    const raw = await AsyncStorage.getItem(FORGE_STATIONS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed as FixedStation[] : [];
  } catch {
    return [];
  }
}

export async function saveFixedStations(stations: FixedStation[]): Promise<void> {
  await AsyncStorage.setItem(FORGE_STATIONS_KEY, JSON.stringify(stations));
  await markCloudDataDirty();
}

export async function loadCurrentWorkout(): Promise<WorkoutPlan | null> {
  const raw = await AsyncStorage.getItem(CURRENT_WORKOUT_KEY);
  return raw ? (JSON.parse(raw) as WorkoutPlan) : null;
}

export async function setCurrentWorkout(plan: WorkoutPlan): Promise<void> {
  await AsyncStorage.setItem(CURRENT_WORKOUT_KEY, JSON.stringify(plan));
  await markCloudDataDirty();
}
