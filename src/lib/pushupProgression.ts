import {
  getInitialPushupProgramWeek,
  getBuildPushupPrescription,
  getCompletedPushupProgramPosition,
  isContinuingPushupTraining,
  getPushupWeek,
  previousPushupProgramPosition,
  PUSHUP_REASSESSMENT_WEEKS,
  selectPushupBracket
} from '@/data/pushupProgram';
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

export function getPushupTargets(state: PushupProgressionState): number[] {
  return getBuildPushupPrescription(state).sets.map((set) => set.reps);
}

export function recognizeStandardPushupPerformance(state: PushupProgressionState, exercise: CompletedExercise, completedAt: string): PushupProgressionState {
  if (exercise.skipped || (exercise.variation ?? state.currentVariation) !== 'standard') return state;
  const reps = Math.max(0, ...exercise.completedSets.filter((set) => set.status === 'completed').map((set) => set.actualReps));
  const bestStandardReps = Math.max(state.bestStandardReps, reps);
  const next = { ...state, bestStandardReps,
    goalCompletedAt: bestStandardReps >= state.goalReps ? state.goalCompletedAt ?? completedAt : undefined };
  if (reps < 50) return next;
  return { ...next, currentVariation: 'standard', baselineMax: Math.max(state.baselineMax, reps),
    assessmentDue: false, assessmentVariation: 'standard', assessmentReason: undefined,
    nextProgramWeekAfterAssessment: undefined, graduationFrom: undefined };
}

export function updatePushupGoal(state: PushupProgressionState, goalReps: number, now: string): PushupProgressionState {
  const next = { ...state, goalReps, goalCompletedAt: state.bestStandardReps >= goalReps ? state.goalCompletedAt ?? now : undefined };
  if (state.currentVariation === 'standard' && state.bestStandardReps >= 50) {
    const anchor = state.lastSuccessfulProgramPosition;
    return { ...next, ...(anchor ? { programWeek: anchor.week, programDay: anchor.day, programBracket: anchor.bracket } : {}), maintenanceSessionsSinceCheckIn: 0,
      assessmentDue: false, assessmentReason: undefined, nextProgramWeekAfterAssessment: undefined, graduationFrom: undefined };
  }
  return next;
}

function nextVariation(variation: PushupVariation): PushupVariation | null {
  return VARIATIONS[VARIATIONS.indexOf(variation) + 1] ?? null;
}

function assessedProgramWeek(state: PushupProgressionState, reps: number, isGraduationAssessment: boolean): number {
  if (isGraduationAssessment) return getInitialPushupProgramWeek(reps);
  const requestedWeek = state.nextProgramWeekAfterAssessment ?? state.programWeek;
  const minimumForWeek = getPushupWeek(requestedWeek).brackets[0].minReps;
  return requestedWeek > 1 && reps < minimumForWeek ? requestedWeek - 1 : requestedWeek;
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
  const isGraduationAssessment = Boolean(state.graduationFrom) && variation !== state.currentVariation;
  const assessment = {
    id: `assessment-${Date.parse(completedAt) || Date.now()}`,
    variation,
    reps,
    completedAt,
    reason: state.assessmentReason ?? (isGraduationAssessment ? 'graduation' as const : 'phase' as const),
    programWeek: state.programWeek
  };
  const bestStandardReps = variation === 'standard' ? Math.max(state.bestStandardReps, reps) : state.bestStandardReps;

  if (variation === 'standard' && reps >= state.goalReps) {
    return {
      state: {
        ...state,
        currentVariation: 'standard',
        lastSuccessfulProgramPosition: variation !== state.currentVariation ? undefined : state.lastSuccessfulProgramPosition,
        baselineMax: reps,
        maintenanceSessionsSinceCheckIn: 0,
        assessmentDue: false,
        assessmentReason: undefined,
        nextProgramWeekAfterAssessment: undefined,
        graduationFrom: undefined,
        assessments: [...state.assessments, assessment],
        bestStandardReps,
        sessionsCompleted: state.sessionsCompleted + 1,
        goalCompletedAt: completedAt
      },
      outcome: 'completed',
      summary: `${state.goalReps} strict standard push-ups achieved. Continue five-set challenge training to maintain your capacity.`
    };
  }

  const programWeek = assessedProgramWeek(state, reps, isGraduationAssessment);
  const bracket = selectPushupBracket(programWeek, reps);
  const assessedState: PushupProgressionState = {
    ...state,
    currentVariation: isGraduationAssessment ? variation : state.currentVariation,
    lastSuccessfulProgramPosition: isGraduationAssessment ? undefined : state.lastSuccessfulProgramPosition,
    baselineMax: reps,
    programWeek,
    programDay: 1,
    programBracket: bracket.id,
    assessmentDue: false,
    assessmentVariation: variation,
    assessmentReason: undefined,
    nextProgramWeekAfterAssessment: undefined,
    graduationFrom: undefined,
    assessments: [...state.assessments, assessment],
    bestStandardReps,
    sessionsCompleted: state.sessionsCompleted + 1
  };

  const threshold = variation === 'standard' ? state.goalReps : GRADUATION_MAX[variation];
  const harder = nextVariation(variation);
  if (harder && reps >= threshold) {
    return {
      state: {
        ...assessedState,
        assessmentDue: true,
        assessmentVariation: harder,
        assessmentReason: 'graduation',
        graduationFrom: variation
      },
      outcome: 'graduated',
      summary: `${variation} level complete. Next session assesses ${harder} push-ups before selecting a new starting bracket.`
    };
  }

  const repeatedEarlierWeek = !isGraduationAssessment
    && state.nextProgramWeekAfterAssessment !== undefined
    && programWeek < state.nextProgramWeekAfterAssessment;
  return {
    state: assessedState,
    outcome: isGraduationAssessment ? 'graduated' : repeatedEarlierWeek ? 'repeated' : 'progressed',
    summary: repeatedEarlierWeek
      ? `${variation} max recorded at ${reps}. Repeat Week ${programWeek} before attempting the next phase.`
      : `${variation} max recorded at ${reps}. Next: Week ${programWeek}, Day 1 · ${bracket.label}.`
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
  const position = getCompletedPushupProgramPosition(exercise);
  const recorded = { ...state, ...(position ? { lastSuccessfulProgramPosition: position } : {}) };
  const recognized = recognizeStandardPushupPerformance(recorded, exercise, completedAt);
  const base = { ...recognized, sessionsCompleted: state.sessionsCompleted + 1 };

  if (!isContinuingPushupTraining(state) && isContinuingPushupTraining(recognized)) {
    return { state: base, outcome: 'progressed', summary: `Recorded ${recognized.bestStandardReps} consecutive standard push-ups. Next session uses five-set challenge training.` };
  }

  if (state.assessmentDue && !isContinuingPushupTraining(state)) {
    return { state: base, outcome: 'repeated', summary: 'Push-up training continues at your current variation while the separate check-in is pending.' };
  }

  if (exercise.skipped || missedTargets === 1) {
    return { state: base, outcome: 'repeated', summary: `Push-up Week ${state.programWeek}, Day ${state.programDay} will repeat.` };
  }

  if (isContinuingPushupTraining(state)) {
    const maintenanceSessions = (state.maintenanceSessionsSinceCheckIn ?? 0) + (missedTargets === 0 ? 1 : 0);
    const cycleComplete = maintenanceSessions >= 3;
    return {
      state: { ...base, maintenanceSessionsSinceCheckIn: cycleComplete ? 0 : maintenanceSessions,
        assessmentDue: state.assessmentDue || (missedTargets === 0 && cycleComplete),
        assessmentVariation: 'standard', assessmentReason: 'final' },
      outcome: missedTargets > 0 ? 'repeated' : 'progressed',
      summary: missedTargets > 0 ? 'Repeat the five-set push-up targets until every set is solid.'
        : cycleComplete ? 'Five-set training continues. A separate max check-in is available to recalibrate your targets.'
          : 'Continue five-set push-up challenge training; your achieved goal stays recorded.'
    };
  }

  if (missedTargets > 1) {
    const previous = previousPushupProgramPosition(state.programWeek, state.programDay);
    return {
      state: {
        ...base,
        programWeek: previous.week,
        programDay: previous.day,
        programBracket: previous.week === state.programWeek ? state.programBracket : selectPushupBracket(previous.week, state.baselineMax).id
      },
      outcome: 'regressed',
      summary: `Push-up volume eased to Week ${previous.week}, Day ${previous.day} for a more repeatable session.`
    };
  }

  if (state.programDay < 3) {
    return {
      state: { ...base, programDay: state.programDay + 1 },
      outcome: 'progressed',
      summary: `Push-up program advanced to Week ${state.programWeek}, Day ${state.programDay + 1}.`
    };
  }

  if ((PUSHUP_REASSESSMENT_WEEKS as readonly number[]).includes(state.programWeek)) {
    const nextWeek = state.programWeek === 6 ? 6 : state.programWeek + 1;
    return {
      state: {
        ...base,
        assessmentDue: true,
        assessmentVariation: state.currentVariation,
        assessmentReason: state.programWeek === 6 ? 'final' : 'phase',
        nextProgramWeekAfterAssessment: nextWeek
      },
      outcome: 'progressed',
      summary: `Week ${state.programWeek} complete. Next session is a ${state.currentVariation} push-up reassessment.`
    };
  }

  const nextWeek = Math.min(6, state.programWeek + 1);
  return {
    state: {
      ...base,
      programWeek: nextWeek,
      programDay: 1,
      programBracket: selectPushupBracket(nextWeek, state.baselineMax).id
    },
    outcome: 'progressed',
    summary: `Push-up program advanced to Week ${nextWeek}, Day 1.`
  };
}
