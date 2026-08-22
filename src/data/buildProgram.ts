import {
  BuildProfile,
  BuildSetupInput,
  BuildTemplateId,
  BuildWorkoutPrescription,
  ExercisePrescription,
  PrescribedSet,
  PushupVariation
} from '@/types/build';
import { getPushupTargets } from '@/lib/pushupProgression';

export const PUSHUP_VARIATIONS: Array<{ id: PushupVariation; label: string }> = [
  { id: 'wall', label: 'Wall' },
  { id: 'incline', label: 'Incline' },
  { id: 'knee', label: 'Knee' },
  { id: 'standard', label: 'Standard' }
];

export const BUILD_TEMPLATES: Array<{
  id: BuildTemplateId;
  title: string;
  day: BuildWorkoutPrescription['scheduledDay'];
}> = [
  { id: 'strength-a', title: 'Strength A', day: 'Monday' },
  { id: 'strength-b', title: 'Strength B', day: 'Wednesday' },
  { id: 'strength-c', title: 'Strength C', day: 'Friday' }
];

const ACCESSORY_TEMPLATES: Record<BuildTemplateId, Array<{
  exerciseId: string;
  name: string;
  reps: number;
  sets: number;
  perSide?: boolean;
  cue: string;
  optional?: boolean;
  equipment: ExercisePrescription['equipment'];
  restSeconds: number;
}>> = {
  'strength-a': [
    { exerciseId: 'dumbbell-single-leg-rdl', name: 'Single-Leg Romanian Deadlift', reps: 8, sets: 3, perSide: true, cue: 'Reach hips back and stay long from head to heel.', equipment: ['dumbbells'], restSeconds: 90 },
    { exerciseId: 'kettlebell-swing', name: 'Kettlebell Swing', reps: 15, sets: 3, cue: 'Snap the hips; let the bell float.', equipment: ['kettlebell'], restSeconds: 60 }
  ],
  'strength-b': [
    { exerciseId: 'dumbbell-squat-press', name: 'Squat to Overhead Press', reps: 8, sets: 3, cue: 'Stand tall before finishing the press.', equipment: ['dumbbells'], restSeconds: 90 },
    { exerciseId: 'dumbbell-rdl', name: 'Romanian Deadlift', reps: 8, sets: 3, cue: 'Keep a long spine and push the hips back.', equipment: ['dumbbells'], restSeconds: 120 },
    { exerciseId: 'step-up', name: 'Step-Up', reps: 8, sets: 2, perSide: true, cue: 'Drive through the whole lead foot.', optional: true, equipment: ['dumbbells', 'step-platform'], restSeconds: 60 }
  ],
  'strength-c': [
    { exerciseId: 'dumbbell-squat-press-light', name: 'Light Squat to Press', reps: 8, sets: 2, cue: 'Keep this crisp and comfortably submaximal.', equipment: ['dumbbells'], restSeconds: 60 },
    { exerciseId: 'kettlebell-swing-light', name: 'Light Kettlebell Swing', reps: 12, sets: 2, cue: 'Stop while every rep is still fast.', equipment: ['kettlebell'], restSeconds: 60 },
    { exerciseId: 'dead-bug', name: 'Dead Bug', reps: 6, sets: 2, perSide: true, cue: 'Move slowly without letting the ribs flare.', optional: true, equipment: ['bodyweight'], restSeconds: 45 }
  ]
};

const DEFAULT_ACCESSORY_LOADS: Record<string, number> = {
  'dumbbell-single-leg-rdl': 15,
  'kettlebell-swing': 25,
  'dumbbell-squat-press': 10,
  'dumbbell-rdl': 20,
  'step-up': 10,
  'dumbbell-squat-press-light': 5,
  'kettlebell-swing-light': 25,
  'dead-bug': 0
};

function makeSets(prefix: string, reps: number[], options?: { loadLb?: number; assistanceLb?: number; perSide?: boolean }): PrescribedSet[] {
  return reps.map((targetReps, index) => ({
    id: `${prefix}-set-${index + 1}`,
    targetReps,
    targetLoadLb: options?.loadLb,
    targetAssistanceLb: options?.assistanceLb,
    perSide: options?.perSide
  }));
}

export function createInitialBuildProfile(input: BuildSetupInput, now = new Date().toISOString()): BuildProfile {
  const assistance = Math.max(0, input.pullupAssistanceLb);
  const pullupStart = assistance === 0 ? [1, 1, 1] : [6, 6, 6];

  return {
    schemaVersion: 1,
    active: true,
    createdAt: now,
    updatedAt: now,
    nextTemplateIndex: 0,
    pullup: {
      enabled: input.pullupEnabled,
      currentAssistanceLb: assistance,
      assistanceIncrementLb: Math.max(1, input.assistanceIncrementLb),
      targetReps: pullupStart.map((reps) => Math.min(reps, Math.max(1, input.pullupCurrentReps))),
      ceilingConfirmations: 0,
      bestUnassistedReps: assistance === 0 ? Math.max(0, input.pullupCurrentReps) : 0,
      sessionsCompleted: 0,
      milestoneDates: {}
    },
    pushup: {
      enabled: input.pushupEnabled,
      currentVariation: input.pushupVariation,
      baselineMax: Math.max(1, input.pushupCurrentMax),
      programSessionIndex: 0,
      successfulWorkoutsSinceAssessment: 0,
      assessmentDue: false,
      assessmentVariation: input.pushupVariation,
      assessments: [],
      bestStandardReps: input.pushupVariation === 'standard' ? Math.max(0, input.pushupCurrentMax) : 0,
      sessionsCompleted: 0,
      goalCompletedAt: input.pushupVariation === 'standard' && input.pushupCurrentMax >= 50 ? now : undefined
    },
    accessories: Object.fromEntries(
      Object.entries(DEFAULT_ACCESSORY_LOADS).map(([id, loadLb]) => [id, { loadLb, successfulSessions: 0 }])
    )
  };
}

export function createBuildWorkout(profile: BuildProfile, now = new Date().toISOString()): BuildWorkoutPrescription {
  const template = BUILD_TEMPLATES[profile.nextTemplateIndex % BUILD_TEMPLATES.length];
  const workoutId = `build-${Date.parse(now) || Date.now()}-${template.id}`;
  const exercises: ExercisePrescription[] = [];

  if (profile.pullup.enabled) {
    const unassisted = profile.pullup.currentAssistanceLb === 0;
    exercises.push({
      id: `${workoutId}-pullup`,
      exerciseId: unassisted ? 'pull-up' : 'assisted-pull-up',
      name: unassisted ? 'Strict Pull-Up' : 'Assisted Pull-Up',
      kind: 'pull-up',
      variation: unassisted ? 'unassisted' : 'assisted',
      sets: makeSets(`${workoutId}-pullup`, profile.pullup.targetReps, { assistanceLb: profile.pullup.currentAssistanceLb }),
      cue: 'Start each rep long, keep the body quiet, and drive elbows down.',
      progressionLabel: unassisted ? 'Building strict pull-up capacity' : `${profile.pullup.currentAssistanceLb} lb assistance`,
      equipment: unassisted ? ['bodyweight', 'pull-up-bar'] : ['pull-up-bar', 'functional-trainer'],
      restSecondsBetweenSets: 120
    });
  }

  if (profile.pushup.enabled && !profile.pushup.goalCompletedAt) {
    const assessment = profile.pushup.assessmentDue;
    const variation = assessment ? profile.pushup.assessmentVariation : profile.pushup.currentVariation;
    const targets = assessment ? [Math.max(1, profile.pushup.baselineMax)] : getPushupTargets(profile.pushup);
    exercises.push({
      id: `${workoutId}-pushup`,
      exerciseId: `${variation}-push-up`,
      name: `${PUSHUP_VARIATIONS.find((item) => item.id === variation)?.label ?? variation} Push-Up${assessment ? ' Assessment' : ''}`,
      kind: assessment ? 'assessment' : 'push-up',
      variation,
      sets: makeSets(`${workoutId}-pushup`, targets),
      cue: assessment ? 'One maximum set of strict, good-form reps. Stop when form changes.' : 'Keep a rigid body line and leave a little in reserve.',
      progressionLabel: assessment ? 'Maximum consecutive good-form reps' : `Program session ${profile.pushup.programSessionIndex + 1}`,
      equipment: variation === 'incline' ? ['bodyweight', 'step-platform'] : ['bodyweight'],
      restSecondsBetweenSets: assessment ? 0 : 90
    });
  }

  ACCESSORY_TEMPLATES[template.id].forEach((accessory) => {
    const state = profile.accessories[accessory.exerciseId];
    exercises.push({
      id: `${workoutId}-${accessory.exerciseId}`,
      exerciseId: accessory.exerciseId,
      name: accessory.name,
      kind: 'accessory',
      sets: makeSets(`${workoutId}-${accessory.exerciseId}`, Array(accessory.sets).fill(accessory.reps), {
        loadLb: state?.loadLb ?? 0,
        perSide: accessory.perSide
      }),
      cue: accessory.cue,
      optional: accessory.optional,
      progressionLabel: accessory.perSide ? 'Each side' : undefined,
      equipment: accessory.equipment,
      restSecondsBetweenSets: accessory.restSeconds
    });
  });

  return {
    id: workoutId,
    source: 'BUILD',
    templateId: template.id,
    title: template.title,
    scheduledDay: template.day,
    createdAt: now,
    exercises
  };
}
