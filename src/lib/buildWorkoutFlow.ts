export type RestAudioCue = 'countdown' | 'start' | null;

export function getRestAudioCue(remainingSeconds: number, paused: boolean): RestAudioCue {
  if (paused || remainingSeconds < 0) return null;
  if (remainingSeconds === 0) return 'start';
  if (remainingSeconds <= 5) return 'countdown';
  return null;
}

export interface SetPosition {
  exerciseIndex: number;
  setIndex: number;
}

interface SetState {
  status: 'pending' | 'completed' | 'skipped';
}

interface ExerciseState {
  skipped: boolean;
  sets: SetState[];
}

export function getPendingSetPositions(exercises: ExerciseState[]): SetPosition[] {
  return exercises.flatMap((exercise, exerciseIndex) => exercise.skipped
    ? []
    : exercise.sets.flatMap((set, setIndex) => set.status === 'pending'
      ? [{ exerciseIndex, setIndex }]
      : []));
}

export function getLastCompletedSetPosition(exercises: ExerciseState[]): SetPosition | null {
  const completed = exercises.flatMap((exercise, exerciseIndex) => exercise.sets.flatMap((set, setIndex) =>
    set.status === 'completed' ? [{ exerciseIndex, setIndex }] : []));
  return completed.at(-1) ?? null;
}
