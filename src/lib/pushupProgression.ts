import {
  CompletedExercise,
  ProgressionUpdate,
  PushupProgressionState,
  PushupVariation
} from '@/types/build';

const VARIATIONS: PushupVariation[] = ['wall', 'incline', 'knee', 'standard'];
const GRADUATION_MAX: Record<Exclude<PushupVariation, 'standard'>, number> = {
  wall: 30,
  incline: 30,
  knee: 40
};
const SET_RATIOS = [0.34, 0.4, 0.25, 0.25, 0.32];

export function getPushupTargets(state: PushupProgressionState): number[] {
  const growth = 1 + Math.min(0.5, state.programSessionIndex * 0.035);
  return SET_RATIOS.map((ratio) => Math.max(3, Math.round(state.baselineMax * ratio * growth)));
}

export function selectPushupStartingLevel(maxReps: number): number {
  if (maxReps < 6) return 0;
  if (maxReps < 12) return 1;
  if (maxReps < 20) return 2;
  if (maxReps < 30) return 3;
  return 4;
}

function nextVariation(variation: PushupVariation): PushupVariation | null {
  return VARIATIONS[VARIATIONS.indexOf(variation) + 1] ?? null;
}

export function applyPushupAssessment(
  state: PushupProgressionState,
  exercise: CompletedExercise,
  completedAt: string
): ProgressionUpdate<PushupProgressionState> {
  const set = exercise.completedSets.find((item) => item.status === 'completed');
  if (!set || exercise.skipped) {
    return { state, outcome: 'repeated', summary: 'Push-up assessment remains scheduled for next time.' };
  }

  const reps = Math.max(0, set.actualReps);
  const variation = (exercise.variation ?? state.assessmentVariation) as PushupVariation;
  const assessment = { id: `assessment-${Date.parse(completedAt) || Date.now()}`, variation, reps, completedAt };
  const bestStandardReps = variation === 'standard' ? Math.max(state.bestStandardReps, reps) : state.bestStandardReps;

  if (variation === 'standard' && reps >= 50) {
    return {
      state: {
        ...state,
        currentVariation: 'standard',
        baselineMax: reps,
        assessmentDue: false,
        assessments: [...state.assessments, assessment],
        bestStandardReps,
        sessionsCompleted: state.sessionsCompleted + 1,
        goalCompletedAt: completedAt
      },
      outcome: 'completed',
      summary: '50 strict standard push-ups achieved. Capability goal complete.'
    };
  }

  const isGraduationAssessment = Boolean(state.graduationFrom) && variation !== state.currentVariation;
  const assessedState: PushupProgressionState = {
    ...state,
    currentVariation: isGraduationAssessment ? variation : state.currentVariation,
    baselineMax: reps,
    programSessionIndex: selectPushupStartingLevel(reps),
    successfulWorkoutsSinceAssessment: 0,
    assessmentDue: false,
    assessmentVariation: variation,
    graduationFrom: undefined,
    assessments: [...state.assessments, assessment],
    bestStandardReps,
    sessionsCompleted: state.sessionsCompleted + 1
  };

  const threshold = variation === 'standard' ? 50 : GRADUATION_MAX[variation];
  const harder = nextVariation(variation);
  if (harder && reps >= threshold) {
    return {
      state: { ...assessedState, assessmentDue: true, assessmentVariation: harder, graduationFrom: variation },
      outcome: 'graduated',
      summary: `${variation} level complete. Next session assesses ${harder} push-ups before setting new volume.`
    };
  }

  return {
    state: assessedState,
    outcome: isGraduationAssessment ? 'graduated' : 'progressed',
    summary: `${variation} push-up capacity set at ${reps}; the next workout is recalibrated from that result.`
  };
}

export function getNextPushupState(
  state: PushupProgressionState,
  exercise: CompletedExercise,
  completedAt: string
): ProgressionUpdate<PushupProgressionState> {
  if (exercise.kind === 'assessment') {
    return applyPushupAssessment(state, exercise, completedAt);
  }

  const completed = exercise.completedSets.filter((set) => set.status === 'completed');
  const missingCount = exercise.prescribedSets.length - completed.length;
  const missedTargets = completed.filter((set) => set.actualReps < set.targetReps).length + missingCount;
  const base = { ...state, sessionsCompleted: state.sessionsCompleted + 1 };

  if (exercise.skipped || missedTargets === 1) {
    return { state: base, outcome: 'repeated', summary: 'Push-up session will repeat before volume increases.' };
  }

  if (missedTargets > 1) {
    return {
      state: { ...base, programSessionIndex: Math.max(0, state.programSessionIndex - 1), successfulWorkoutsSinceAssessment: 0 },
      outcome: 'regressed',
      summary: 'Push-up volume eased one step for a more repeatable session.'
    };
  }

  const successes = state.successfulWorkoutsSinceAssessment + 1;
  const assessmentDue = successes >= 6;
  return {
    state: {
      ...base,
      programSessionIndex: state.programSessionIndex + 1,
      successfulWorkoutsSinceAssessment: assessmentDue ? 0 : successes,
      assessmentDue,
      assessmentVariation: state.currentVariation
    },
    outcome: 'progressed',
    summary: assessmentDue
      ? `Six solid sessions complete. Next time is a ${state.currentVariation} push-up assessment.`
      : `Push-up program advanced to session ${state.programSessionIndex + 2}.`
  };
}
