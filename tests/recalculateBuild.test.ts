import assert from 'node:assert/strict';
import test from 'node:test';
import { createBuildWorkout, createInitialBuildProfile } from '@/data/buildProgram';
import { recalculateBuildFromHistory } from '@/lib/recalculateBuild';
import { getNextPushupState } from '@/lib/pushupProgression';
import { BuildProfile, BuildWorkoutResult, CompletedExercise } from '@/types/build';

function profile(): BuildProfile {
  const saved = createInitialBuildProfile({
    pullupEnabled: true, pullupAssistanceLb: 75, pullupCurrentReps: 8, assistanceIncrementLb: 5,
    pushupEnabled: true, pushupVariation: 'standard', pushupCurrentMax: 35, pushupGoalReps: 70
  }, '2026-10-01T12:00:00.000Z');
  return { ...saved, pullup: { ...saved.pullup, targetReps: [8, 8, 8], sessionsCompleted: 10 },
    pushup: { ...saved.pushup, assessmentDue: true }, nextTemplateIndex: 2 };
}

function result(id: string, date: string, reps = [10, 10, 10], assistance = 75): BuildWorkoutResult {
  const workout = createBuildWorkout(profile(), date);
  const prescription = workout.exercises.find((item) => item.kind === 'pull-up')!;
  const exercise: CompletedExercise = {
    prescriptionId: prescription.id, exerciseId: prescription.exerciseId, name: prescription.name,
    kind: 'pull-up', variation: 'assisted', prescribedSets: prescription.sets,
    completedSets: prescription.sets.map((set, index) => ({ ...set, actualReps: reps[index], actualAssistanceLb: assistance, status: 'completed' })), skipped: false
  };
  return { id, workoutId: workout.id, source: 'BUILD', title: workout.title, templateId: workout.templateId,
    scheduledDay: workout.scheduledDay, startedAt: date, completedAt: date, status: 'completed', exercises: [exercise], progressionSummary: [] };
}

const first = result('first', '2026-10-02T12:00:00.000Z');
const second = result('second', '2026-10-04T12:00:00.000Z');
const NOW = '2026-10-09T12:00:00.000Z';

test('recalculation recognizes two old 10/10/10 logs and lowers assistance once', () => {
  const saved = profile();
  const next = recalculateBuildFromHistory(saved, [second, first], NOW).profile;
  assert.equal(next.pullup.currentAssistanceLb, 70);
  assert.deepEqual(next.pullup.targetReps, [6, 6, 6]);
  assert.equal(next.pullup.sessionsCompleted, saved.pullup.sessionsCompleted);
  assert.equal(next.nextTemplateIndex, saved.nextTemplateIndex);
  assert.strictEqual(next.accessories, saved.accessories);
  assert.strictEqual(next.bodyWeightHistory, saved.bodyWeightHistory);
  assert.deepEqual(recalculateBuildFromHistory(next, [first, second, second], NOW).profile, next);
});

test('one ceiling session sets 10/10/10 without reducing assistance', () => {
  const next = recalculateBuildFromHistory(profile(), [second], NOW).profile;
  assert.equal(next.pullup.currentAssistanceLb, 75);
  assert.deepEqual(next.pullup.targetReps, [10, 10, 10]);
});

test('ceiling sessions at different assistance levels are not combined', () => {
  const next = recalculateBuildFromHistory(profile(), [first, result('lower', second.completedAt, [10, 10, 10], 70)], NOW).profile;
  assert.equal(next.pullup.currentAssistanceLb, 70);
  assert.deepEqual(next.pullup.targetReps, [10, 10, 10]);
});

test('duplicate and pre-setup history cannot manufacture two ceiling confirmations', () => {
  const old = result('old', '2026-09-01T12:00:00.000Z');
  const next = recalculateBuildFromHistory(profile(), [second, second, old], NOW).profile;
  assert.equal(next.pullup.currentAssistanceLb, 75);
});

test('partial pull-up results cannot reduce assistance', () => {
  const partial = structuredClone(second);
  partial.status = 'partial';
  partial.exercises[0].completedSets[2].status = 'skipped';
  const next = recalculateBuildFromHistory(profile(), [first, partial], NOW).profile;
  assert.equal(next.pullup.currentAssistanceLb, 75);
});

test('empty history keeps progress while pending check-ins allow five training sets', () => {
  const saved = profile();
  const next = recalculateBuildFromHistory(saved, [], NOW).profile;
  assert.deepEqual(next.pullup, saved.pullup);
  assert.equal(next.pushup.assessmentDue, true);
  assert.equal(createBuildWorkout(next, NOW).exercises.find((item) => item.kind === 'push-up')?.sets.length, 5);
});

function pushupLog(variation: 'standard' | 'knee'): CompletedExercise {
  return { prescriptionId: 'pushup', exerciseId: `${variation}-push-up`, name: 'Push-up', kind: 'push-up', variation,
    prescribedSets: [{ id: 'pushup-set', targetReps: 30 }],
    completedSets: [{ id: 'pushup-set', targetReps: 30, actualReps: 50, status: 'completed' }], skipped: false };
}

test('recalculation recognizes a logged standard set of 50 and restores continued training', () => {
  const log = { ...second, exercises: [pushupLog('standard')] };
  const next = recalculateBuildFromHistory(profile(), [log], NOW).profile;
  assert.equal(next.pushup.bestStandardReps, 50);
  assert.equal(next.pushup.baselineMax, 50);
  assert.equal(next.pushup.goalReps, 70);
  assert.equal(next.pushup.assessmentDue, false);
  assert.deepEqual(createBuildWorkout(next, NOW).exercises.find((item) => item.kind === 'push-up')?.sets.map((set) => set.targetReps), [25, 30, 20, 15, 40]);
});

test('new training logs recognize standard capability without treating knee reps as standard', () => {
  const next = getNextPushupState(profile().pushup, pushupLog('standard'), NOW).state;
  assert.equal(next.bestStandardReps, 50);
  assert.equal(next.assessmentDue, false);
  const knee = getNextPushupState({ ...profile().pushup, currentVariation: 'knee' }, pushupLog('knee'), NOW).state;
  assert.equal(knee.bestStandardReps, 35);
});

test('phase and graduation check-ins retain current-variation training without advancing the phase', () => {
  const saved = { ...profile().pushup, currentVariation: 'knee' as const, programWeek: 5, programDay: 3, assessmentVariation: 'standard' as const, graduationFrom: 'knee' as const };
  const workout = createBuildWorkout({ ...profile(), pushup: saved }, NOW);
  const prescription = workout.exercises.find((item) => item.kind === 'push-up')!;
  assert.equal(prescription.variation, 'knee');
  assert.equal(prescription.sets.length, 5);
  const log = { ...pushupLog('knee'), prescribedSets: prescription.sets,
    completedSets: prescription.sets.map((set) => ({ ...set, actualReps: set.targetReps, status: 'completed' as const })) };
  const next = getNextPushupState(saved, log, NOW).state;
  assert.equal(next.assessmentDue, true);
  assert.equal(next.currentVariation, 'knee');
  assert.equal(next.programWeek, 5);
  assert.equal(next.programDay, 3);
});
