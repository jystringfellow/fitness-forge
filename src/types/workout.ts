export const TIME_OPTIONS = [15, 20, 25, 30] as const;
export type TimeOption = (typeof TIME_OPTIONS)[number];

export const ENERGY_OPTIONS = ['low', 'normal', 'high'] as const;
export type Energy = (typeof ENERGY_OPTIONS)[number];

export const FOCUS_OPTIONS = [
  'full body',
  'core + back',
  'endurance',
  'legs + power',
  'recovery',
  'sprint'
] as const;
export type Focus = (typeof FOCUS_OPTIONS)[number];

export const ATTACHMENT_OPTIONS = [
  'recommended',
  'ankle-cuffs',
  'curl-bar',
  'dumbbells',
  'handles',
  'kettlebell',
  'rope',
  'strap',
  'straight-bar'
] as const;
export type Attachment = (typeof ATTACHMENT_OPTIONS)[number];
export type ConcreteAttachment = Exclude<Attachment, 'recommended'>;

export type ExerciseTag =
  | 'anti-rotation'
  | 'athletic'
  | 'balance'
  | 'cardio'
  | 'conditioning'
  | 'core'
  | 'full body'
  | 'legs'
  | 'mobility'
  | 'plyo'
  | 'power'
  | 'posterior'
  | 'posture'
  | 'pull'
  | 'push'
  | 'recovery'
  | 'sprint'
  | 'stability';

export interface Exercise {
  id: string;
  name: string;
  attachment: ConcreteAttachment;
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
