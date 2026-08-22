import assert from 'node:assert/strict';
import test from 'node:test';
import { prependUniqueHistory } from '@/storage/appStorage';
import { WorkoutHistoryEntry } from '@/types/build';

test('unified history preserves BUILD and FORGE source distinctions and prevents duplicate completion', () => {
  const build: WorkoutHistoryEntry = {
    id: 'build-1', workoutId: 'workout-1', source: 'BUILD', title: 'Strength A', templateId: 'strength-a',
    scheduledDay: 'Monday', startedAt: '2026-01-01', completedAt: '2026-01-01', status: 'completed', exercises: [], progressionSummary: []
  };
  const forge: WorkoutHistoryEntry = {
    id: 'forge-1', source: 'FORGE', title: '20-min full body forge', completedAt: '2026-01-02', durationMinutes: 20,
    focus: 'full body', exerciseNames: ['Kettlebell Swing']
  };
  const history = prependUniqueHistory(prependUniqueHistory([], build), forge);
  assert.deepEqual(history.map((item) => item.source), ['FORGE', 'BUILD']);
  assert.strictEqual(prependUniqueHistory(history, forge), history);
  assert.deepEqual(JSON.parse(JSON.stringify(history)), history);
});
