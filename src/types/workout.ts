export type TimeOption = 15 | 20 | 25 | 30;
export type Energy = 'low' | 'normal' | 'high';
export type Focus =
  | 'full body'
  | 'sprint'
  | 'endurance'
  | 'core + back'
  | 'legs + power'
  | 'recovery';

export type Attachment = 'auto' | 'rope' | 'strap' | 'handles' | 'bar';

export type ExerciseTag =
  | 'cardio'
  | 'plyo'
  | 'pull'
  | 'posterior'
  | 'legs'
  | 'core'
  | 'athletic'
  | 'mobility'
  | 'recovery';

export interface Exercise {
  id: string;
  name: string;
  attachment: Exclude<Attachment, 'auto'>;
  tags: ExerciseTag[];
  focus: Focus[];
  cue: string;
}

export interface GenerateWorkoutInput {
  time: TimeOption;
  energy: Energy;
  focus: Focus;
  attachment: Attachment;
}

export interface WorkoutPlan {
  title: string;
  createdAt: string;
  input: GenerateWorkoutInput;
  cardioBlock: string[];
  mainBlock: {
    rounds: number;
    workSeconds: number;
    restSeconds: number;
    exercises: Exercise[];
  };
  note?: string;
}
