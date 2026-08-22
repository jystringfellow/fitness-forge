import assert from 'node:assert/strict';
import test from 'node:test';
import { migrateBuildProfile, prependUniqueHistory } from '@/storage/appStorage';
import { createInitialBuildProfile } from '@/data/buildProgram';
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

test('schema v1 BUILD profiles migrate into the table-driven week and phase model', () => {
  const current = createInitialBuildProfile({
    pullupEnabled: true, pullupAssistanceLb: 40, pullupCurrentReps: 10, assistanceIncrementLb: 5,
    pushupEnabled: true, pushupVariation: 'knee', pushupCurrentMax: 22
  }, '2026-01-01T00:00:00.000Z');
  const legacy = {
    ...current,
    schemaVersion: 1,
    pushup: {
      enabled: true,
      currentVariation: 'knee',
      baselineMax: 22,
      programSessionIndex: 6,
      successfulWorkoutsSinceAssessment: 0,
      assessmentDue: true,
      assessmentVariation: 'knee',
      assessments: [],
      bestStandardReps: 0,
      sessionsCompleted: 6
    }
  };
  const migrated = migrateBuildProfile(legacy);
  assert.equal(migrated?.schemaVersion, 2);
  assert.equal(migrated?.pushup.programWeek, 2);
  assert.equal(migrated?.pushup.programDay, 3);
  assert.equal(migrated?.pushup.programBracket, '11-20');
  assert.equal(migrated?.pushup.nextProgramWeekAfterAssessment, 3);
});
