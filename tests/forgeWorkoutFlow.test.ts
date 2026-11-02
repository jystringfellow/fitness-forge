import assert from 'node:assert/strict';
import test from 'node:test';
import { displayStepText, hasLoggedLinkedSet, nextStepAnnouncement, shouldAnnounceNextStep, shouldPlayRestCountdownCue, shouldWaitForLinkedLog } from '@/lib/forgeWorkoutFlow';
import { ForgeSetResult, WorkoutIntervalStep } from '@/types/workout';

test('circuit rest runs after timed BUILD work and waits only for an unlogged result', () => {
  const rest: WorkoutIntervalStep = { text: 'Rest', durationSecs: 20, isRest: true,
    linkedSet: { exerciseId: 'pullup', setIndex: 1, targetReps: 6 } };
  const logged: ForgeSetResult[] = [{ exerciseId: 'pullup', setIndex: 1, actualReps: 5, status: 'completed' }];
  assert.equal(shouldWaitForLinkedLog(rest, []), true);
  assert.equal(hasLoggedLinkedSet(rest, logged), true);
  assert.equal(shouldWaitForLinkedLog(rest, logged), false);
  assert.equal(shouldWaitForLinkedLog({ ...rest, isRest: false }, []), false);
  const following: WorkoutIntervalStep = { text: 'Knee Push-Up', durationSecs: 25, isRest: false, exerciseName: 'Knee Push-Up' };
  assert.equal(nextStepAnnouncement({ ...rest, exerciseName: 'Assisted Pull-Up' }, following), 'Next: Knee Push-Up.');
  assert.equal(nextStepAnnouncement(rest, null), null);
  assert.equal(nextStepAnnouncement(following, null), 'Next: Knee Push-Up.');
  assert.equal(nextStepAnnouncement({ text: 'Walk', durationSecs: 30, isRest: true, exerciseName: 'Walk' }, null), 'Next: Walk.');
});

test('next-step voice cue begins with ten seconds remaining', () => {
  const work: WorkoutIntervalStep = { text: 'Push-Up', durationSecs: 30, isRest: false };
  const rest: WorkoutIntervalStep = { text: 'Rest for 20s', durationSecs: 20, isRest: true };
  assert.equal(shouldAnnounceNextStep(work, rest, 10, true), true);
  assert.equal(shouldAnnounceNextStep(work, rest, 7, true), false);
  assert.equal(shouldAnnounceNextStep({ ...work, durationSecs: 10 }, rest, 10, true), true);
  assert.equal(shouldAnnounceNextStep({ ...work, durationSecs: 9 }, rest, 9, true), false);
  assert.equal(shouldAnnounceNextStep(work, rest, 10, false), false);
});

test('circuit rest uses the BUILD countdown chime before the next exercise', () => {
  const rest: WorkoutIntervalStep = { text: 'Rest for 20s', durationSecs: 20, isRest: true };
  const exercise: WorkoutIntervalStep = { text: 'Pull-Up', durationSecs: 25, isRest: false, exerciseName: 'Pull-Up' };
  assert.equal(shouldPlayRestCountdownCue(rest, exercise, 6, true), false);
  for (const second of [5, 4, 3, 2, 1]) {
    assert.equal(shouldPlayRestCountdownCue(rest, exercise, second, true), true);
  }
  assert.equal(shouldPlayRestCountdownCue(rest, exercise, 0, true), false);
  assert.equal(shouldPlayRestCountdownCue(rest, exercise, 5, false), false);
  assert.equal(shouldPlayRestCountdownCue(exercise, exercise, 5, true), false);
  assert.equal(shouldPlayRestCountdownCue(rest, null, 5, true), false);
});

test('saved rest steps with old reset wording display as rest', () => {
  const old: WorkoutIntervalStep = { text: '20s reset · log Knee Push-Up reps', durationSecs: 20, isRest: true,
    exerciseName: 'Knee Push-Up', linkedSet: { exerciseId: 'pushup', setIndex: 0, targetReps: 10 } };
  assert.equal(displayStepText(old), 'Rest for 20s · log Knee Push-Up reps');
});
