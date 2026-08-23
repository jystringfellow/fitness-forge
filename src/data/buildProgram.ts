import {
  BuildProfile,
  BuildSetupInput,
  BuildTemplateId,
  BuildWorkoutPrescription,
  ExercisePrescription,
  PrescribedSet,
  PushupVariation
} from '@/types/build';
import { getInitialPushupProgramWeek, getPushupProgramPrescription, PushupSetTarget, selectPushupBracket } from '@/data/pushupProgram';

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
  restCategory: 'strength' | 'conditioning';
}>> = {
  'strength-a': [
    { exerciseId: 'dumbbell-single-leg-rdl', name: 'Single-Leg Romanian Deadlift', reps: 8, sets: 3, perSide: true, cue: 'Reach hips back and stay long from head to heel.', equipment: ['dumbbells'], restCategory: 'strength' },
    { exerciseId: 'kettlebell-swing', name: 'Kettlebell Swing', reps: 15, sets: 3, cue: 'Snap the hips; let the bell float.', equipment: ['kettlebell'], restCategory: 'conditioning' }
  ],
  'strength-b': [
    { exerciseId: 'dumbbell-squat-press', name: 'Squat to Overhead Press', reps: 8, sets: 3, cue: 'Stand tall before finishing the press.', equipment: ['dumbbells'], restCategory: 'strength' },
    { exerciseId: 'dumbbell-rdl', name: 'Romanian Deadlift', reps: 8, sets: 3, cue: 'Keep a long spine and push the hips back.', equipment: ['dumbbells'], restCategory: 'strength' },
    { exerciseId: 'step-up', name: 'Step-Up', reps: 8, sets: 2, perSide: true, cue: 'Drive through the whole lead foot.', optional: true, equipment: ['dumbbells', 'step-platform'], restCategory: 'strength' }
  ],
  'strength-c': [
    { exerciseId: 'dumbbell-squat-press-light', name: 'Light Squat to Press', reps: 8, sets: 2, cue: 'Keep this crisp and comfortably submaximal.', equipment: ['dumbbells'], restCategory: 'conditioning' },
    { exerciseId: 'kettlebell-swing-light', name: 'Light Kettlebell Swing', reps: 12, sets: 2, cue: 'Stop while every rep is still fast.', equipment: ['kettlebell'], restCategory: 'conditioning' },
    { exerciseId: 'dead-bug', name: 'Dead Bug', reps: 6, sets: 2, perSide: true, cue: 'Move slowly without letting the ribs flare.', optional: true, equipment: ['bodyweight'], restCategory: 'conditioning' }
  ]
};

export const DEFAULT_BUILD_REST_PREFERENCES: BuildProfile['rest'] = {
  pullupSeconds: 60,
  pushupMode: 'custom',
  pushupSeconds: 60,
  strengthSeconds: 60,
  conditioningSeconds: 45
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

function makeSets(prefix: string, targets: Array<number | PushupSetTarget>, options?: { loadLb?: number; assistanceLb?: number; perSide?: boolean }): PrescribedSet[] {
  return targets.map((target, index) => ({
    id: `${prefix}-set-${index + 1}`,
    targetReps: typeof target === 'number' ? target : target.reps,
    targetType: typeof target === 'number' ? 'fixed' : target.type,
    targetLoadLb: options?.loadLb,
    targetAssistanceLb: options?.assistanceLb,
    perSide: options?.perSide
  }));
}

export function createInitialBuildProfile(input: BuildSetupInput, now = new Date().toISOString()): BuildProfile {
  const assistance = Math.max(0, input.pullupAssistanceLb);
  const pullupStart = assistance === 0 ? [1, 1, 1] : [6, 6, 6];
  const pushupBaseline = Math.max(1, input.pushupCurrentMax);
  const pushupWeek = getInitialPushupProgramWeek(pushupBaseline);
  const pushupBracket = selectPushupBracket(pushupWeek, pushupBaseline);

  return {
    schemaVersion: 3,
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
      baselineMax: pushupBaseline,
      programWeek: pushupWeek,
      programDay: 1,
      programBracket: pushupBracket.id,
      assessmentDue: false,
      assessmentVariation: input.pushupVariation,
      assessments: input.pushupEnabled ? [{
        id: `assessment-baseline-${Date.parse(now) || Date.now()}`,
        variation: input.pushupVariation,
        reps: pushupBaseline,
        completedAt: now,
        reason: 'baseline',
        programWeek: pushupWeek
      }] : [],
      bestStandardReps: input.pushupVariation === 'standard' ? Math.max(0, input.pushupCurrentMax) : 0,
      sessionsCompleted: 0,
      goalCompletedAt: input.pushupVariation === 'standard' && input.pushupCurrentMax >= 50 ? now : undefined
    },
    accessories: Object.fromEntries(
      Object.entries(DEFAULT_ACCESSORY_LOADS).map(([id, loadLb]) => [id, { loadLb, successfulSessions: 0 }])
    ),
    rest: { ...DEFAULT_BUILD_REST_PREFERENCES }
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
      restSecondsBetweenSets: profile.rest.pullupSeconds
    });
  }

  if (profile.pushup.enabled && !profile.pushup.goalCompletedAt) {
    const assessment = profile.pushup.assessmentDue;
    const variation = assessment ? profile.pushup.assessmentVariation : profile.pushup.currentVariation;
    const program = getPushupProgramPrescription(profile.pushup);
    const targets: Array<number | PushupSetTarget> = assessment
      ? [{ type: 'minimum', reps: Math.max(1, profile.pushup.baselineMax) }]
      : program.sets;
    exercises.push({
      id: `${workoutId}-pushup`,
      exerciseId: `${variation}-push-up`,
      name: `${PUSHUP_VARIATIONS.find((item) => item.id === variation)?.label ?? variation} Push-Up${assessment ? ' Assessment' : ''}`,
      kind: assessment ? 'assessment' : 'push-up',
      variation,
      sets: makeSets(`${workoutId}-pushup`, targets),
      cue: assessment ? 'One maximum set of strict, good-form reps. Stop when form changes.' : 'Keep a rigid body line and leave a little in reserve.',
      progressionLabel: assessment ? 'Maximum consecutive good-form reps' : `Week ${program.week} · Day ${program.day} · ${program.bracket.label}`,
      equipment: variation === 'incline' ? ['bodyweight', 'step-platform'] : ['bodyweight'],
      restSecondsBetweenSets: assessment
        ? 0
        : profile.rest.pushupMode === 'program'
          ? program.restSeconds
          : profile.rest.pushupSeconds,
      programContext: {
        week: program.week,
        day: program.day,
        bracket: program.bracket.label
      }
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
      restSecondsBetweenSets: accessory.restCategory === 'strength'
        ? profile.rest.strengthSeconds
        : profile.rest.conditioningSeconds
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
