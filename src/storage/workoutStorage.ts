import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutPlan } from '@/types/workout';

const CURRENT_WORKOUT_KEY = 'fitness_forge/current_workout';

export async function loadCurrentWorkout(): Promise<WorkoutPlan | null> {
  const raw = await AsyncStorage.getItem(CURRENT_WORKOUT_KEY);
  return raw ? (JSON.parse(raw) as WorkoutPlan) : null;
}

export async function setCurrentWorkout(plan: WorkoutPlan): Promise<void> {
  await AsyncStorage.setItem(CURRENT_WORKOUT_KEY, JSON.stringify(plan));
}
