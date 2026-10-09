import assert from 'node:assert/strict';
import test from 'node:test';
import { createBuildWorkout, createInitialBuildProfile } from '@/data/buildProgram';
import { recalculateBuildFromHistory } from '@/lib/recalculateBuild';
import { applyPushupAssessment, getNextPushupState, updatePushupGoal } from '@/lib/pushupProgression';
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

function provenWorkout(date: string): BuildWorkoutResult {
  const reps = [23, 28, 23, 23, 33];
  const prescribedSets = reps.map((targetReps, index) => ({ id: `pushup-${index}`, targetReps, targetType: index === 4 ? 'minimum' as const : 'fixed' as const }));
  return { ...result(`pushup-${date}`, date), exercises: [{
    prescriptionId: 'pushup', exerciseId: 'standard-push-up', name: 'Push-up', kind: 'push-up', variation: 'standard',
    prescribedSets, completedSets: prescribedSets.map((set) => ({ ...set, actualReps: set.targetReps, status: 'completed' })), skipped: false,
    programContext: { week: 4, day: 3, bracket: '21–25' }
  }] };
}

test('a max of 52 maintains the repeatedly completed 23/28/23/23/33+ workout', () => {
  const saved = profile();
  saved.pushup = { ...saved.pushup, goalReps: 50, baselineMax: 52, bestStandardReps: 52,
    programWeek: 6, programDay: 1, programBracket: '51-60', assessments: [{
      id: 'max-52', variation: 'standard', reps: 52, completedAt: '2026-10-08T12:00:00.000Z'
    }] };
  const history = Array.from({ length: 5 }, (_, index) => provenWorkout(`2026-10-0${index + 2}T12:00:00.000Z`));
  const next = recalculateBuildFromHistory(saved, history, NOW).profile;
  const pushup = createBuildWorkout(next, NOW).exercises.find((exercise) => exercise.kind === 'push-up')!;
  assert.deepEqual(pushup.sets.map((set) => set.targetReps), [23, 28, 23, 23, 33]);
  assert.equal(pushup.sets[4].targetType, 'minimum');
  assert.deepEqual(pushup.programContext, { week: 4, day: 3, bracket: '21–25' });
  assert.equal(next.pushup.baselineMax, 52);
  assert.match(pushup.progressionLabel!, /maintenance/);
  assert.deepEqual(recalculateBuildFromHistory(next, history, NOW).profile, next);

  const raised = updatePushupGoal(next.pushup, 70, NOW);
  assert.equal(raised.goalCompletedAt, undefined);
  assert.equal(raised.programWeek, 4);
  assert.equal(raised.programDay, 3);
  assert.deepEqual(createBuildWorkout({ ...next, pushup: raised }, NOW).exercises.find((item) => item.kind === 'push-up')!.sets.map((set) => set.targetReps), [23, 28, 23, 23, 33]);
  const advanced = getNextPushupState(raised, history[4].exercises[0], NOW).state;
  assert.equal(advanced.assessmentDue, true);
  assert.equal(advanced.nextProgramWeekAfterAssessment, 5);
  const assessed = applyPushupAssessment(advanced, { ...pushupLog('standard'), kind: 'assessment',
    completedSets: [{ id: 'max', targetReps: 0, actualReps: 52, status: 'completed' }] }, NOW).state;
  assert.equal(assessed.programWeek, 5);
  const week5 = createBuildWorkout({ ...next, pushup: assessed }, NOW).exercises.find((item) => item.kind === 'push-up')!;
  assert.deepEqual(week5.sets.map((set) => set.targetReps), [36, 40, 30, 24, 40]);
  const completed: CompletedExercise = { ...history[4].exercises[0], prescribedSets: week5.sets,
    completedSets: week5.sets.map((set) => ({ ...set, actualReps: set.targetReps, status: 'completed' })) };
  const day2 = getNextPushupState(assessed, completed, NOW).state;
  assert.equal(day2.programDay, 2);
  assert.equal(createBuildWorkout({ ...next, pushup: day2 }, NOW).exercises.find((item) => item.kind === 'push-up')!.sets.length, 8);
});

test('a skipped or failed table workout cannot become the maintenance anchor', () => {
  const saved = profile();
  saved.pushup = { ...saved.pushup, goalReps: 50, baselineMax: 52, bestStandardReps: 52 };
  const success = provenWorkout('2026-10-02T12:00:00.000Z');
  const failed = provenWorkout('2026-10-04T12:00:00.000Z');
  failed.exercises[0].completedSets[4].actualReps = 30;
  // A later failure leaves the last demonstrated table workout intact.
  const next = recalculateBuildFromHistory(saved, [failed, success], NOW).profile;
  assert.deepEqual(next.pushup.lastSuccessfulProgramPosition, { week: 4, day: 3, bracket: '21-25' });
  const noSuccess = recalculateBuildFromHistory(saved, [failed], NOW).profile;
  assert.equal(noSuccess.pushup.lastSuccessfulProgramPosition, undefined);
});

test('recalculation preserves later eight-set challenge progress after a five-set anchor', () => {
  const saved = profile();
  saved.pushup = { ...saved.pushup, goalReps: 70, baselineMax: 52, bestStandardReps: 52,
    programWeek: 5, programDay: 3, programBracket: 'over-40', assessmentDue: false };
  const previous = provenWorkout('2026-10-02T12:00:00.000Z');
  const prescription = createBuildWorkout({ ...saved, pushup: { ...saved.pushup, programDay: 2 } }, NOW)
    .exercises.find((item) => item.kind === 'push-up')!;
  const recent = { ...provenWorkout('2026-10-04T12:00:00.000Z'), exercises: [{
    ...previous.exercises[0], prescribedSets: prescription.sets,
    completedSets: prescription.sets.map((set) => ({ ...set, actualReps: set.targetReps, status: 'completed' as const })),
    programContext: prescription.programContext
  }] };
  const next = recalculateBuildFromHistory(saved, [previous, recent], NOW).profile;
  assert.equal(next.pushup.programWeek, 5);
  assert.equal(next.pushup.programDay, 3);
  assert.equal(createBuildWorkout(next, NOW).exercises.find((item) => item.kind === 'push-up')!.sets.length, 8);
});

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
  assert.deepEqual(createBuildWorkout(next, NOW).exercises.find((item) => item.kind === 'push-up')?.sets.map((set) => set.targetReps), [14, 18, 14, 14, 20]);
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
