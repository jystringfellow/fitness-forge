import assert from 'node:assert/strict';
import test from 'node:test';
import { loadActiveBuildWorkout, loadBuildProfile, migrateBuildProfile, prependUniqueHistory, saveRecalculatedBuild, STORAGE_KEYS } from '@/storage/appStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBuildWorkout, createInitialBuildProfile } from '@/data/buildProgram';
import { updatePushupGoal } from '@/lib/pushupProgression';
import { WorkoutHistoryEntry } from '@/types/build';

test('applying recalculation saves profile and Today together without writing history', async (context) => {
  const writes: Array<[string, string]> = [];
  context.mock.method(AsyncStorage, 'multiSet', async (values: Array<[string, string]>) => { writes.push(...values); });
  context.mock.method(AsyncStorage, 'setItem', async () => {});
  const profile = createInitialBuildProfile({
    pullupEnabled: true, pullupAssistanceLb: 70, pullupCurrentReps: 6, assistanceIncrementLb: 5,
    pushupEnabled: true, pushupVariation: 'standard', pushupCurrentMax: 50
  });
  await saveRecalculatedBuild(profile);
  assert.deepEqual(writes.map(([key]) => key), [STORAGE_KEYS.profile, STORAGE_KEYS.activeBuildWorkout]);
  assert.deepEqual(JSON.parse(writes[0][1]), JSON.parse(JSON.stringify(profile)));
  const workout = JSON.parse(writes[1][1]);
  assert.equal(workout.exercises.find((exercise: { kind: string }) => exercise.kind === 'push-up').sets.length, 5);
  assert.equal(workout.exercises.find((exercise: { kind: string }) => exercise.kind === 'pull-up').sets[0].targetAssistanceLb, 70);
});

test('stored completed profiles recover five-set training and stale Today prescriptions refresh', async (context) => {
  const now = '2026-10-09T12:00:00.000Z';
  const profile = createInitialBuildProfile({
    pullupEnabled: true, pullupAssistanceLb: 40, pullupCurrentReps: 6, assistanceIncrementLb: 5,
    pushupEnabled: true, pushupVariation: 'standard', pushupCurrentMax: 50
  }, now);
  const oldWorkout = createBuildWorkout(profile, now);
  oldWorkout.exercises = oldWorkout.exercises.filter((exercise) => exercise.kind !== 'push-up');
  const values = new Map<string, string>([
    [STORAGE_KEYS.profile, JSON.stringify(profile)],
    [STORAGE_KEYS.activeBuildWorkout, JSON.stringify(oldWorkout)]
  ]);
  context.mock.method(AsyncStorage, 'getItem', async (key: string) => values.get(key) ?? null);
  context.mock.method(AsyncStorage, 'setItem', async (key: string, value: string) => { values.set(key, value); });
  context.mock.method(AsyncStorage, 'removeItem', async (key: string) => { values.delete(key); });
  const repaired = await loadBuildProfile();
  assert.equal(repaired?.pushup.programWeek, 6);
  assert.equal(repaired?.pushup.goalCompletedAt, now);

  // A cached workout may also arrive from another device or a prior app version.
  values.set(STORAGE_KEYS.activeBuildWorkout, JSON.stringify(oldWorkout));
  const changed = { ...repaired!, pushup: updatePushupGoal(repaired!.pushup, 70, now),
    pullup: { ...profile.pullup, targetReps: [10, 10, 10] } };
  values.set(STORAGE_KEYS.profile, JSON.stringify(changed));
  const refreshed = await loadActiveBuildWorkout();
  assert.equal(refreshed?.exercises.find((exercise) => exercise.kind === 'push-up')?.sets.length, 5);
  assert.match(refreshed?.exercises.find((exercise) => exercise.kind === 'push-up')?.progressionLabel ?? '', /70 consecutive goal/);
  assert.deepEqual(refreshed?.exercises.find((exercise) => exercise.kind === 'pull-up')?.sets.map((set) => set.targetReps), [10, 10, 10]);
  assert.equal(values.get(STORAGE_KEYS.activeBuildWorkout), JSON.stringify(refreshed));
});

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
  assert.equal(migrated?.schemaVersion, 5);
  assert.equal(migrated?.pushup.goalReps, 50);
  assert.deepEqual(migrated?.bodyWeightHistory, []);
  assert.equal(migrated?.pullup.successfulSessionsAtCurrentAssistance, 0);
  assert.equal(migrated?.pushup.programWeek, 2);
  assert.equal(migrated?.pushup.programDay, 3);
  assert.equal(migrated?.pushup.programBracket, '11-20');
  assert.equal(migrated?.pushup.nextProgramWeekAfterAssessment, 3);
  assert.deepEqual(migrated?.rest, {
    pullupSeconds: 60,
    pushupMode: 'custom',
    pushupSeconds: 60,
    strengthSeconds: 60,
    conditioningSeconds: 45
  });
});

test('schema v2 profiles retain progression while gaining dense rest defaults', () => {
  const current = createInitialBuildProfile({
    pullupEnabled: true, pullupAssistanceLb: 40, pullupCurrentReps: 10, assistanceIncrementLb: 5,
    pushupEnabled: true, pushupVariation: 'knee', pushupCurrentMax: 18
  }, '2026-01-01T00:00:00.000Z');
  const { rest: _rest, ...withoutRest } = current;
  const migrated = migrateBuildProfile({ ...withoutRest, schemaVersion: 2 });
  assert.equal(migrated?.schemaVersion, 5);
  assert.equal(migrated?.pushup.programWeek, current.pushup.programWeek);
  assert.equal(migrated?.rest.pullupSeconds, 60);
  assert.equal(migrated?.rest.conditioningSeconds, 45);
});
