import { CompletedExercise, ProgressionUpdate, PullupProgressionState } from '@/types/build';

const ASSISTED_FLOOR = 6;
const ASSISTED_CEILING = 10;

function completedSets(exercise: CompletedExercise) {
  return exercise.completedSets.filter((set) => set.status === 'completed');
}

function regressTargets(targets: number[], floor: number): number[] {
  const next = [...targets];
  const highest = Math.max(...next);
  const index = next.lastIndexOf(highest);
  next[index] = Math.max(floor, next[index] - 1);
  return next;
}

function progressDistributed(targets: number[]): number[] {
  const next = [...targets];
  const minimum = Math.min(...next);
  const index = next.indexOf(minimum);
  next[index] += 1;
  return next;
}

function progressUnassisted(targets: number[]): number[] {
  if (targets.length < 5) {
    return [...targets, 1];
  }
  return progressDistributed(targets);
}

export function getNextPullupState(
  state: PullupProgressionState,
  exercise: CompletedExercise,
  completedAt: string
): ProgressionUpdate<PullupProgressionState> {
  const sets = completedSets(exercise);
  const allRecorded = !exercise.skipped && sets.length === exercise.prescribedSets.length;
  const misses = sets.filter((set) => set.actualReps < set.targetReps).length + (exercise.prescribedSets.length - sets.length);
  const assistanceValues = sets.map((set) => set.actualAssistanceLb ?? set.targetAssistanceLb ?? state.currentAssistanceLb);
  const actualAssistance = assistanceValues.length ? Math.max(...assistanceValues) : state.currentAssistanceLb;
  const changedAssistance = actualAssistance !== state.currentAssistanceLb;
  const success = allRecorded && misses === 0;
  const bestUnassisted = actualAssistance === 0
    ? Math.max(state.bestUnassistedReps, ...sets.map((set) => set.actualReps), 0)
    : state.bestUnassistedReps;
  const milestoneDates = { ...state.milestoneDates };

  if (bestUnassisted >= 1 && !milestoneDates['first-unassisted']) milestoneDates['first-unassisted'] = completedAt;
  if (bestUnassisted >= 3 && !milestoneDates['three-unassisted']) milestoneDates['three-unassisted'] = completedAt;
  if (bestUnassisted >= 5 && !milestoneDates['five-unassisted']) milestoneDates['five-unassisted'] = completedAt;
  if (bestUnassisted >= 10 && !milestoneDates['ten-unassisted']) milestoneDates['ten-unassisted'] = completedAt;

  const baseState: PullupProgressionState = {
    ...state,
    bestUnassistedReps: bestUnassisted,
    milestoneDates,
    sessionsCompleted: state.sessionsCompleted + 1
  };

  if (!allRecorded || misses === 1) {
    return { state: baseState, outcome: 'repeated', summary: 'Pull-up target will repeat so every set can feel solid.' };
  }

  if (misses > 1) {
    return {
      state: {
        ...baseState,
        targetReps: regressTargets(state.targetReps, state.currentAssistanceLb === 0 ? 1 : Math.min(ASSISTED_FLOOR, ...state.targetReps)),
        ceilingConfirmations: 0
      },
      outcome: 'regressed',
      summary: 'Pull-up volume eased slightly for the next session.'
    };
  }

  if (changedAssistance) {
    const harder = actualAssistance < state.currentAssistanceLb;
    const resetReps = Math.max(1, Math.min(ASSISTED_FLOOR, ...sets.map((set) => set.actualReps)));
    return {
      state: {
        ...baseState,
        currentAssistanceLb: Math.max(0, actualAssistance),
        targetReps: actualAssistance === 0 ? [1, 1, 1] : [resetReps, resetReps, resetReps],
        ceilingConfirmations: 0
      },
      outcome: harder ? 'graduated' : 'regressed',
      summary: `${Math.max(0, actualAssistance)} lb assistance recorded; the next target recalibrates conservatively.`
    };
  }

  if (state.currentAssistanceLb === 0) {
    return {
      state: { ...baseState, targetReps: progressUnassisted(state.targetReps) },
      outcome: 'progressed',
      summary: `Next pull-up target: ${progressUnassisted(state.targetReps).join(' / ')} unassisted.`
    };
  }

  const atCeiling = state.targetReps.every((target) => target >= ASSISTED_CEILING);
  if (!atCeiling) {
    const targetReps = progressDistributed(state.targetReps);
    return {
      state: { ...baseState, targetReps, ceilingConfirmations: 0 },
      outcome: 'progressed',
      summary: `Next pull-up target: ${targetReps.join(' / ')} @ ${state.currentAssistanceLb} lb assistance.`
    };
  }

  if (state.ceilingConfirmations < 1) {
    return {
      state: { ...baseState, ceilingConfirmations: 1 },
      outcome: 'repeated',
      summary: 'Pull-up ceiling reached once; confirm it once more before reducing assistance.'
    };
  }

  const nextAssistance = Math.max(0, state.currentAssistanceLb - state.assistanceIncrementLb);
  return {
    state: {
      ...baseState,
      currentAssistanceLb: nextAssistance,
      targetReps: nextAssistance === 0 ? [1, 1, 1] : [ASSISTED_FLOOR, ASSISTED_FLOOR, ASSISTED_FLOOR],
      ceilingConfirmations: 0
    },
    outcome: 'graduated',
    summary: nextAssistance === 0
      ? 'Assistance reached zero. Next session begins strict unassisted singles.'
      : `Next pull-up workout: 3 × 6 @ ${nextAssistance} lb assistance.`
  };
}
