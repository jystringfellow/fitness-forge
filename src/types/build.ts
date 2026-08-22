import { EquipmentId } from '@/types/workout';

export type WorkoutSource = 'BUILD' | 'FORGE';

export type BuildGoalId = 'first-pull-up' | 'fifty-push-ups';
export type BuildTemplateId = 'strength-a' | 'strength-b' | 'strength-c';
export type PrescriptionKind = 'pull-up' | 'push-up' | 'accessory' | 'assessment';
export type SetStatus = 'pending' | 'completed' | 'skipped';
export type PushupVariation = 'wall' | 'incline' | 'knee' | 'standard';

export interface PullupProgressionState {
  enabled: boolean;
  currentAssistanceLb: number;
  assistanceIncrementLb: number;
  targetReps: number[];
  ceilingConfirmations: number;
  bestUnassistedReps: number;
  sessionsCompleted: number;
  milestoneDates: Partial<Record<'first-unassisted' | 'three-unassisted' | 'five-unassisted' | 'ten-unassisted', string>>;
}

export interface PushupAssessment {
  id: string;
  variation: PushupVariation;
  reps: number;
  completedAt: string;
}

export interface PushupProgressionState {
  enabled: boolean;
  currentVariation: PushupVariation;
  baselineMax: number;
  programSessionIndex: number;
  successfulWorkoutsSinceAssessment: number;
  assessmentDue: boolean;
  assessmentVariation: PushupVariation;
  graduationFrom?: PushupVariation;
  assessments: PushupAssessment[];
  bestStandardReps: number;
  sessionsCompleted: number;
  goalCompletedAt?: string;
}

export interface AccessoryState {
  loadLb: number;
  successfulSessions: number;
}

export interface BuildProfile {
  schemaVersion: 1;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  nextTemplateIndex: number;
  pullup: PullupProgressionState;
  pushup: PushupProgressionState;
  accessories: Record<string, AccessoryState>;
}

export interface PrescribedSet {
  id: string;
  targetReps: number;
  targetLoadLb?: number;
  targetAssistanceLb?: number;
  perSide?: boolean;
}

export interface ExercisePrescription {
  id: string;
  exerciseId: string;
  name: string;
  kind: PrescriptionKind;
  variation?: PushupVariation | 'assisted' | 'unassisted';
  sets: PrescribedSet[];
  cue: string;
  optional?: boolean;
  progressionLabel?: string;
  equipment: EquipmentId[];
}

export interface BuildWorkoutPrescription {
  id: string;
  source: 'BUILD';
  templateId: BuildTemplateId;
  title: string;
  scheduledDay: 'Monday' | 'Wednesday' | 'Friday';
  createdAt: string;
  exercises: ExercisePrescription[];
}

export interface CompletedSet extends PrescribedSet {
  actualReps: number;
  actualLoadLb?: number;
  actualAssistanceLb?: number;
  status: Exclude<SetStatus, 'pending'>;
  notes?: string;
}

export interface CompletedExercise {
  prescriptionId: string;
  exerciseId: string;
  name: string;
  kind: PrescriptionKind;
  variation?: ExercisePrescription['variation'];
  prescribedSets: PrescribedSet[];
  completedSets: CompletedSet[];
  skipped: boolean;
  notes?: string;
}

export interface BuildWorkoutResult {
  id: string;
  workoutId: string;
  source: 'BUILD';
  title: string;
  templateId: BuildTemplateId;
  scheduledDay: BuildWorkoutPrescription['scheduledDay'];
  startedAt: string;
  completedAt: string;
  status: 'completed' | 'partial' | 'skipped';
  exercises: CompletedExercise[];
  progressionSummary: string[];
}

export interface ForgeWorkoutHistoryEntry {
  id: string;
  source: 'FORGE';
  title: string;
  completedAt: string;
  durationMinutes: number;
  focus: string;
  exerciseNames: string[];
}

export type WorkoutHistoryEntry = BuildWorkoutResult | ForgeWorkoutHistoryEntry;

export interface BuildSetupInput {
  pullupEnabled: boolean;
  pullupAssistanceLb: number;
  pullupCurrentReps: number;
  assistanceIncrementLb: number;
  pushupEnabled: boolean;
  pushupVariation: PushupVariation;
  pushupCurrentMax: number;
}

export interface ProgressionUpdate<T> {
  state: T;
  outcome: 'progressed' | 'repeated' | 'regressed' | 'graduated' | 'completed';
  summary: string;
}
