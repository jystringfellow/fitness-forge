import assert from 'node:assert/strict';
import test from 'node:test';
import { createBuildWorkout, createInitialBuildProfile } from '@/data/buildProgram';
import { advanceBuildProfile } from '@/lib/buildProgression';
import { getNextPullupState } from '@/lib/pullupProgression';
import { applyPushupAssessment, getNextPushupState, getPushupTargets } from '@/lib/pushupProgression';
import {
  BuildProfile,
  BuildWorkoutResult,
  CompletedExercise,
  PullupProgressionState,
  PushupProgressionState,
  PushupVariation
} from '@/types/build';

const NOW = '2026-08-22T12:00:00.000Z';

function pullupState(overrides: Partial<PullupProgressionState> = {}): PullupProgressionState {
  return {
    enabled: true,
    currentAssistanceLb: 40,
    assistanceIncrementLb: 5,
    targetReps: [6, 6, 6],
    ceilingConfirmations: 0,
    bestUnassistedReps: 0,
    sessionsCompleted: 0,
    milestoneDates: {},
    ...overrides
  };
}

function pushupState(overrides: Partial<PushupProgressionState> = {}): PushupProgressionState {
  return {
    enabled: true,
    currentVariation: 'knee',
    baselineMax: 18,
    programWeek: 1,
    programDay: 1,
    programBracket: '11-20',
    assessmentDue: false,
    assessmentVariation: 'knee',
    assessments: [],
    bestStandardReps: 0,
    sessionsCompleted: 0,
    ...overrides
  };
}

function exercise(
  kind: CompletedExercise['kind'],
  targets: number[],
  actuals: Array<number | 'skip'>,
  options: { variation?: PushupVariation | 'assisted' | 'unassisted'; assistance?: number; actualAssistance?: number; load?: number } = {}
): CompletedExercise {
  const prescribedSets = targets.map((targetReps, index) => ({
    id: `set-${index}`,
    targetReps,
    targetAssistanceLb: options.assistance,
    targetLoadLb: options.load
  }));
  return {
    prescriptionId: 'prescription',
    exerciseId: 'exercise',
    name: 'Exercise',
    kind,
    variation: options.variation,
    prescribedSets,
    completedSets: actuals.map((actual, index) => ({
      ...prescribedSets[index],
      actualReps: actual === 'skip' ? 0 : actual,
      actualAssistanceLb: options.actualAssistance ?? options.assistance,
      actualLoadLb: options.load,
      status: actual === 'skip' ? 'skipped' : 'completed'
    })),
    skipped: actuals.every((actual) => actual === 'skip')
  };
}

test('pull-ups distribute one additional rep after an exact or exceeded target', () => {
  assert.deepEqual(getNextPullupState(pullupState(), exercise('pull-up', [6, 6, 6], [6, 6, 6], { assistance: 40 }), NOW).state.targetReps, [7, 6, 6]);
  assert.deepEqual(getNextPullupState(pullupState(), exercise('pull-up', [6, 6, 6], [8, 7, 6], { assistance: 40 }), NOW).state.targetReps, [7, 6, 6]);
});

test('one missed or skipped pull-up set repeats the prescription', () => {
  for (const actuals of [[6, 6, 5], [6, 6, 'skip'] as Array<number | 'skip'>]) {
    const update = getNextPullupState(pullupState(), exercise('pull-up', [6, 6, 6], actuals, { assistance: 40 }), NOW);
    assert.equal(update.outcome, 'repeated');
    assert.deepEqual(update.state.targetReps, [6, 6, 6]);
  }
});

test('multiple missed pull-up sets regress only one rep', () => {
  const state = pullupState({ targetReps: [7, 7, 6] });
  const update = getNextPullupState(state, exercise('pull-up', state.targetReps, [5, 5, 6], { assistance: 40 }), NOW);
  assert.equal(update.outcome, 'regressed');
  assert.deepEqual(update.state.targetReps, [7, 6, 6]);
});

test('pull-up ceiling requires two successful confirmations before reducing assistance', () => {
  const state = pullupState({ targetReps: [10, 10, 10] });
  const first = getNextPullupState(state, exercise('pull-up', state.targetReps, [10, 10, 10], { assistance: 40 }), NOW);
  assert.equal(first.outcome, 'repeated');
  assert.equal(first.state.currentAssistanceLb, 40);
  const second = getNextPullupState(first.state, exercise('pull-up', state.targetReps, [10, 10, 10], { assistance: 40 }), NOW);
  assert.equal(second.outcome, 'graduated');
  assert.equal(second.state.currentAssistanceLb, 35);
  assert.deepEqual(second.state.targetReps, [6, 6, 6]);
});

test('assistance reaching zero resets to conservative unassisted singles', () => {
  const state = pullupState({ currentAssistanceLb: 5, targetReps: [10, 10, 10], ceilingConfirmations: 1 });
  const update = getNextPullupState(state, exercise('pull-up', state.targetReps, [10, 10, 10], { assistance: 5 }), NOW);
  assert.equal(update.state.currentAssistanceLb, 0);
  assert.deepEqual(update.state.targetReps, [1, 1, 1]);
});

test('first unassisted pull-up is preserved as a milestone and capacity then grows', () => {
  const state = pullupState({ currentAssistanceLb: 0, targetReps: [1, 1, 1] });
  const update = getNextPullupState(state, exercise('pull-up', state.targetReps, [1, 1, 1], { assistance: 0, variation: 'unassisted' }), NOW);
  assert.equal(update.state.bestUnassistedReps, 1);
  assert.equal(update.state.milestoneDates['first-unassisted'], NOW);
  assert.deepEqual(update.state.targetReps, [1, 1, 1, 1]);
});

test('manual assistance changes recalibrate rather than stacking progression', () => {
  const harder = getNextPullupState(pullupState(), exercise('pull-up', [6, 6, 6], [6, 6, 6], { assistance: 40, actualAssistance: 35 }), NOW);
  assert.equal(harder.state.currentAssistanceLb, 35);
  assert.deepEqual(harder.state.targetReps, [6, 6, 6]);
  const easier = getNextPullupState(pullupState(), exercise('pull-up', [6, 6, 6], [6, 6, 6], { assistance: 40, actualAssistance: 45 }), NOW);
  assert.equal(easier.outcome, 'regressed');
  assert.equal(easier.state.currentAssistanceLb, 45);
});

test('push-up prescriptions use the selected table column with a fluctuating final minimum set', () => {
  const targets = getPushupTargets(pushupState());
  assert.deepEqual(targets, [10, 12, 7, 7, 9]);
  const profile = createInitialBuildProfile({
    pullupEnabled: false, pullupAssistanceLb: 0, pullupCurrentReps: 0, assistanceIncrementLb: 5,
    pushupEnabled: true, pushupVariation: 'knee', pushupCurrentMax: 18
  }, NOW);
  const pushup = createBuildWorkout(profile, NOW).exercises.find((item) => item.kind === 'push-up');
  assert.equal(pushup?.sets[4].targetType, 'minimum');
  assert.equal(pushup?.programContext?.bracket, '11–20');
});

test('a high initial assessment selects the Week 3 starting phase instead of mislabeling Week 1', () => {
  const profile = createInitialBuildProfile({
    pullupEnabled: false, pullupAssistanceLb: 0, pullupCurrentReps: 0, assistanceIncrementLb: 5,
    pushupEnabled: true, pushupVariation: 'standard', pushupCurrentMax: 24
  }, NOW);
  assert.equal(profile.pushup.programWeek, 3);
  assert.equal(profile.pushup.programBracket, '21-25');
  const pushup = createBuildWorkout(profile, NOW).exercises.find((item) => item.kind === 'push-up');
  assert.deepEqual(pushup?.sets.map((set) => set.targetReps), [12, 17, 13, 13, 17]);
});

test('successful push-up workouts advance by day and reassess after Week 2', () => {
  const state = pushupState();
  const targets = getPushupTargets(state);
  const update = getNextPushupState(state, exercise('push-up', targets, targets, { variation: 'knee' }), NOW);
  assert.equal(update.state.programWeek, 1);
  assert.equal(update.state.programDay, 2);

  const phaseEnd = pushupState({ programWeek: 2, programDay: 3, programBracket: '11-20' });
  const phaseTargets = getPushupTargets(phaseEnd);
  const assessed = getNextPushupState(phaseEnd, exercise('push-up', phaseTargets, phaseTargets, { variation: 'knee' }), NOW);
  assert.equal(assessed.state.assessmentDue, true);
  assert.equal(assessed.state.nextProgramWeekAfterAssessment, 3);
  assert.equal(assessed.state.assessmentReason, 'phase');
});

test('phase boundaries reassess after Weeks 2, 4, 5, and 6', () => {
  const phases = [
    { week: 2, baselineMax: 18, bracket: '11-20' as const, next: 3 },
    { week: 4, baselineMax: 27, bracket: 'over-25' as const, next: 5 },
    { week: 5, baselineMax: 42, bracket: 'over-40' as const, next: 6 },
    { week: 6, baselineMax: 48, bracket: '46-50' as const, next: 6 }
  ];
  for (const phase of phases) {
    const state = pushupState({ programWeek: phase.week, programDay: 3, baselineMax: phase.baselineMax, programBracket: phase.bracket });
    const targets = getPushupTargets(state);
    const update = getNextPushupState(state, exercise('push-up', targets, targets, { variation: 'knee' }), NOW);
    assert.equal(update.state.assessmentDue, true);
    assert.equal(update.state.nextProgramWeekAfterAssessment, phase.next);
  }
});

test('a minimum-rep final set accepts and records reps beyond the minimum', () => {
  const state = pushupState();
  const targets = getPushupTargets(state);
  const actuals = [...targets];
  actuals[actuals.length - 1] = 14;
  const update = getNextPushupState(state, exercise('push-up', targets, actuals, { variation: 'knee' }), NOW);
  assert.equal(update.outcome, 'progressed');
  assert.equal(update.state.programDay, 2);
  assert.equal(actuals.at(-1), 14);
});

test('one failed push-up set repeats while several failures regress a program step', () => {
  const state = pushupState({ programWeek: 3, programDay: 2, programBracket: '16-20' });
  const targets = getPushupTargets(state);
  const oneMiss = [...targets]; oneMiss[4] -= 1;
  const repeated = getNextPushupState(state, exercise('push-up', targets, oneMiss, { variation: 'knee' }), NOW).state;
  assert.deepEqual([repeated.programWeek, repeated.programDay], [3, 2]);
  const manyMisses = targets.map((target, index) => index < 2 ? target - 2 : target);
  const regressed = getNextPushupState(state, exercise('push-up', targets, manyMisses, { variation: 'knee' }), NOW).state;
  assert.deepEqual([regressed.programWeek, regressed.programDay], [3, 1]);
});

test('phase assessments update brackets and repeat the prior week when the next phase is not ready', () => {
  const state = pushupState({ programWeek: 2, programDay: 3, assessmentDue: true, nextProgramWeekAfterAssessment: 3, assessmentReason: 'phase' });
  const improved = applyPushupAssessment(state, exercise('assessment', [30], [36], { variation: 'knee' }), NOW);
  assert.equal(improved.state.baselineMax, 36);
  assert.equal(improved.state.programWeek, 3);
  assert.equal(improved.state.programBracket, 'over-25');
  const decreased = applyPushupAssessment({ ...improved.state, assessmentDue: true, nextProgramWeekAfterAssessment: 5, assessmentReason: 'phase' }, exercise('assessment', [36], [22], { variation: 'knee' }), NOW);
  assert.equal(decreased.state.baselineMax, 22);
  assert.equal(decreased.state.programWeek, 4);
  assert.equal(decreased.outcome, 'repeated');
  assert.equal(decreased.state.assessments.length, 2);
});

test('knee graduation schedules a standard assessment and recalibrates from its result', () => {
  const knee = applyPushupAssessment(pushupState({ assessmentDue: true }), exercise('assessment', [30], [40], { variation: 'knee' }), NOW);
  assert.equal(knee.state.currentVariation, 'knee');
  assert.equal(knee.state.assessmentVariation, 'standard');
  assert.equal(knee.state.assessmentDue, true);
  const standard = applyPushupAssessment(knee.state, exercise('assessment', [1], [8], { variation: 'standard' }), NOW);
  assert.equal(standard.state.currentVariation, 'standard');
  assert.equal(standard.state.baselineMax, 8);
  assert.equal(standard.state.programWeek, 1);
  assert.equal(standard.state.programDay, 1);
  assert.equal(standard.state.programBracket, '6-10');
  assert.equal(standard.state.assessmentDue, false);
});

test('50 standard push-ups completes the goal without scheduling more volume', () => {
  const state = pushupState({ currentVariation: 'standard', assessmentVariation: 'standard', assessmentDue: true });
  const update = applyPushupAssessment(state, exercise('assessment', [40], [50], { variation: 'standard' }), NOW);
  assert.equal(update.outcome, 'completed');
  assert.equal(update.state.goalCompletedAt, NOW);
  assert.equal(update.state.bestStandardReps, 50);
});

test('workout prescriptions and results preserve planned versus actual context', () => {
  const profile = createInitialBuildProfile({
    pullupEnabled: true,
    pullupAssistanceLb: 40,
    pullupCurrentReps: 10,
    assistanceIncrementLb: 5,
    pushupEnabled: true,
    pushupVariation: 'knee',
    pushupCurrentMax: 30
  }, NOW);
  const workout = createBuildWorkout(profile, NOW);
  const pullup = workout.exercises[0];
  const completedPullup = exercise('pull-up', pullup.sets.map((set) => set.targetReps), [6, 6, 5], { assistance: 40, actualAssistance: 35 });
  completedPullup.prescribedSets = pullup.sets;
  assert.equal(completedPullup.prescribedSets[0].targetAssistanceLb, 40);
  assert.equal(completedPullup.completedSets[0].actualAssistanceLb, 35);
  assert.notStrictEqual(completedPullup.prescribedSets, completedPullup.completedSets);
});

test('advancing a completed BUILD result keeps source context and rotates the weekly template', () => {
  const profile: BuildProfile = createInitialBuildProfile({
    pullupEnabled: false,
    pullupAssistanceLb: 0,
    pullupCurrentReps: 0,
    assistanceIncrementLb: 5,
    pushupEnabled: false,
    pushupVariation: 'knee',
    pushupCurrentMax: 10
  }, NOW);
  const result: BuildWorkoutResult = {
    id: 'result', workoutId: 'workout', source: 'BUILD', title: 'Strength A', templateId: 'strength-a', scheduledDay: 'Monday',
    startedAt: NOW, completedAt: NOW, status: 'completed', exercises: [], progressionSummary: []
  };
  const next = advanceBuildProfile(profile, result);
  assert.equal(result.source, 'BUILD');
  assert.equal(next.nextTemplateIndex, 1);
});

test('skipping an entire workout records the date without advancing the program', () => {
  const profile = createInitialBuildProfile({
    pullupEnabled: true, pullupAssistanceLb: 40, pullupCurrentReps: 10, assistanceIncrementLb: 5,
    pushupEnabled: true, pushupVariation: 'knee', pushupCurrentMax: 20
  }, '2026-01-01T00:00:00.000Z');
  const result: BuildWorkoutResult = {
    id: 'skip', workoutId: 'workout', source: 'BUILD', title: 'Strength A', templateId: 'strength-a', scheduledDay: 'Monday',
    startedAt: NOW, completedAt: NOW, status: 'skipped', exercises: [], progressionSummary: []
  };
  const next = advanceBuildProfile(profile, result);
  assert.equal(next.nextTemplateIndex, 0);
  assert.deepEqual(next.pullup.targetReps, profile.pullup.targetReps);
  assert.equal(next.updatedAt, NOW);
});

test('a long break does not trigger automatic regression or punishment', () => {
  const profile = createInitialBuildProfile({
    pullupEnabled: true, pullupAssistanceLb: 40, pullupCurrentReps: 10, assistanceIncrementLb: 5,
    pushupEnabled: true, pushupVariation: 'knee', pushupCurrentMax: 20
  }, '2025-01-01T00:00:00.000Z');
  const workout = createBuildWorkout(profile, '2026-08-22T00:00:00.000Z');
  assert.deepEqual(workout.exercises.find((item) => item.kind === 'pull-up')?.sets.map((set) => set.targetReps), profile.pullup.targetReps);
  assert.equal(workout.templateId, 'strength-a');
});

test('BUILD prescriptions include exercise-specific rest intervals', () => {
  const profile = createInitialBuildProfile({
    pullupEnabled: true, pullupAssistanceLb: 40, pullupCurrentReps: 10, assistanceIncrementLb: 5,
    pushupEnabled: true, pushupVariation: 'knee', pushupCurrentMax: 20
  }, NOW);
  const strengthA = createBuildWorkout(profile, NOW);
  assert.deepEqual(
    Object.fromEntries(strengthA.exercises.map((item) => [item.exerciseId, item.restSecondsBetweenSets])),
    { 'assisted-pull-up': 60, 'knee-push-up': 60, 'dumbbell-single-leg-rdl': 60, 'kettlebell-swing': 45 }
  );

  const strengthB = createBuildWorkout({ ...profile, nextTemplateIndex: 1 }, NOW);
  assert.equal(strengthB.exercises.find((item) => item.exerciseId === 'dumbbell-rdl')?.restSecondsBetweenSets, 60);
  assert.equal(strengthB.exercises.find((item) => item.exerciseId === 'dumbbell-squat-press')?.restSecondsBetweenSets, 60);

  const assessment = createBuildWorkout({
    ...profile,
    pushup: { ...profile.pushup, assessmentDue: true, assessmentVariation: 'knee' }
  }, NOW);
  assert.equal(assessment.exercises.find((item) => item.kind === 'assessment')?.restSecondsBetweenSets, 0);
});

test('rest preferences override every BUILD category while program push-up rest remains available', () => {
  const profile = createInitialBuildProfile({
    pullupEnabled: true, pullupAssistanceLb: 40, pullupCurrentReps: 10, assistanceIncrementLb: 5,
    pushupEnabled: true, pushupVariation: 'knee', pushupCurrentMax: 20
  }, NOW);
  const dense = createBuildWorkout({
    ...profile,
    rest: { pullupSeconds: 45, pushupMode: 'custom', pushupSeconds: 45, strengthSeconds: 45, conditioningSeconds: 30 }
  }, NOW);
  assert.deepEqual(
    Object.fromEntries(dense.exercises.map((item) => [item.exerciseId, item.restSecondsBetweenSets])),
    { 'assisted-pull-up': 45, 'knee-push-up': 45, 'dumbbell-single-leg-rdl': 45, 'kettlebell-swing': 30 }
  );

  const tableRest = createBuildWorkout({
    ...profile,
    pushup: { ...profile.pushup, programWeek: 2, programDay: 3, programBracket: '11-20' },
    rest: { ...profile.rest, pushupMode: 'program' }
  }, NOW);
  assert.equal(tableRest.exercises.find((item) => item.kind === 'push-up')?.restSecondsBetweenSets, 120);
});
