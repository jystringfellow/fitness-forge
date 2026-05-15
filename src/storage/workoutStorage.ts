import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutPlan } from '@/types/workout';

const FAVORITES_KEY = 'fitness_forge/favorites';
const HISTORY_KEY = 'fitness_forge/history';
const CURRENT_WORKOUT_KEY = 'fitness_forge/current_workout';

export async function loadFavorites(): Promise<WorkoutPlan[]> {
  const raw = await AsyncStorage.getItem(FAVORITES_KEY);
  return raw ? (JSON.parse(raw) as WorkoutPlan[]) : [];
}

export async function addFavorite(plan: WorkoutPlan): Promise<void> {
  const current = await loadFavorites();
  const exists = current.some((item) => item.createdAt === plan.createdAt);
  if (!exists) {
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify([plan, ...current].slice(0, 25)));
  }
}

export async function loadHistory(): Promise<WorkoutPlan[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  return raw ? (JSON.parse(raw) as WorkoutPlan[]) : [];
}

export async function addHistory(plan: WorkoutPlan): Promise<void> {
  const current = await loadHistory();
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify([plan, ...current].slice(0, 50)));
}

export async function loadCurrentWorkout(): Promise<WorkoutPlan | null> {
  const raw = await AsyncStorage.getItem(CURRENT_WORKOUT_KEY);
  return raw ? (JSON.parse(raw) as WorkoutPlan) : null;
}

export async function setCurrentWorkout(plan: WorkoutPlan): Promise<void> {
  await AsyncStorage.setItem(CURRENT_WORKOUT_KEY, JSON.stringify(plan));
}
