import assert from 'node:assert/strict';
import test from 'node:test';
import { generateWorkout } from '@/lib/generateWorkout';
import {
  ATTACHMENT_OPTIONS,
  ENERGY_OPTIONS,
  FOCUS_OPTIONS,
  TIME_OPTIONS
} from '@/types/workout';

test('generated workouts honor the selected duration', () => {
  for (const time of TIME_OPTIONS) {
    for (const energy of ENERGY_OPTIONS) {
      for (const focus of FOCUS_OPTIONS) {
        for (const attachment of ATTACHMENT_OPTIONS) {
          for (let sample = 0; sample < 3; sample += 1) {
            const plan = generateWorkout({ time, energy, focus, attachment }, true);
            const scheduledDurationSecs = plan.intervalSteps
              .filter((step) => step.section !== 'finisher')
              .reduce((sum, step) => sum + step.durationSecs, 0);
            const expectedDurationSecs = time * 60;

            assert.ok(
              Math.abs(scheduledDurationSecs - expectedDurationSecs) <= 2,
              `${time} min / ${energy} / ${focus} / ${attachment} generated ${scheduledDurationSecs}s`
            );
            assert.ok(plan.intervalSteps.some((step) => step.section === 'cardio'));
            assert.ok(plan.intervalSteps.some((step) => step.section === 'main' && !step.isPrompt));
            assert.notEqual(plan.input.attachment, 'recommended');
          }
        }
      }
    }
  }
});

test('workout exercises are unique within a generated main block', () => {
  for (let sample = 0; sample < 100; sample += 1) {
    const plan = generateWorkout(
      {
        time: 20,
        energy: 'normal',
        focus: 'full body',
        attachment: 'recommended'
      },
      true
    );
    const exerciseIds = plan.mainBlock.exercises.map((exercise) => exercise.id);

    assert.equal(new Set(exerciseIds).size, exerciseIds.length);
  }
});
