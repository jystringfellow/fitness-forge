import assert from 'node:assert/strict';
import test from 'node:test';
import { getLastCompletedSetPosition, getPendingSetPositions, getRestAudioCue } from '@/lib/buildWorkoutFlow';

test('rest audio cues count down over the final five seconds and chime at zero', () => {
  assert.equal(getRestAudioCue(6, false), null);
  assert.equal(getRestAudioCue(5, false), 'countdown');
  assert.equal(getRestAudioCue(1, false), 'countdown');
  assert.equal(getRestAudioCue(0, false), 'start');
  assert.equal(getRestAudioCue(3, true), null);
});

test('workout flow focuses the first pending set and ignores skipped exercises', () => {
  const exercises = [
    { skipped: false, sets: [{ status: 'completed' as const }, { status: 'pending' as const }] },
    { skipped: true, sets: [{ status: 'pending' as const }] },
    { skipped: false, sets: [{ status: 'pending' as const }] }
  ];
  assert.deepEqual(getPendingSetPositions(exercises), [
    { exerciseIndex: 0, setIndex: 1 },
    { exerciseIndex: 2, setIndex: 0 }
  ]);
  assert.deepEqual(getLastCompletedSetPosition(exercises), { exerciseIndex: 0, setIndex: 0 });
});
