import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_LOCAL_HISTORY, mergeWorkoutHistory, shouldUploadLocalState } from '@/lib/cloudMerge';
import { WorkoutHistoryEntry } from '@/types/build';

function forgeEntry(id: string, completedAt: string, title = id): WorkoutHistoryEntry {
  return {
    id,
    source: 'FORGE',
    title,
    completedAt,
    durationMinutes: 20,
    focus: 'full body',
    exerciseNames: ['Kettlebell Swing']
  };
}

test('cloud history merge is newest-first, deduplicated, and keeps the local copy on conflict', () => {
  const merged = mergeWorkoutHistory(
    [forgeEntry('shared', '2026-08-23T12:00:00.000Z', 'local'), forgeEntry('local', '2026-08-22T12:00:00.000Z')],
    [forgeEntry('cloud', '2026-08-24T12:00:00.000Z'), forgeEntry('shared', '2026-08-23T12:00:00.000Z', 'cloud')]
  );

  assert.deepEqual(merged.map((entry) => entry.id), ['cloud', 'shared', 'local']);
  assert.equal(merged.find((entry) => entry.id === 'shared')?.title, 'local');
});

test('cloud history merge respects the local retention limit', () => {
  const history = Array.from({ length: MAX_LOCAL_HISTORY + 10 }, (_, index) =>
    forgeEntry(String(index), new Date(Date.UTC(2026, 0, index + 1)).toISOString())
  );
  assert.equal(mergeWorkoutHistory(history, []).length, MAX_LOCAL_HISTORY);
});

test('a new cloud row adopts anonymous local data', () => {
  assert.equal(shouldUploadLocalState({
    cloudStateExists: false,
    cloudOwnerId: null,
    userId: 'user-a',
    dirtyAt: '2026-08-23T12:00:00.000Z',
    lastSyncedAt: null
  }), true);
});

test('an existing cloud row wins on a device that has never linked the account', () => {
  assert.equal(shouldUploadLocalState({
    cloudStateExists: true,
    cloudOwnerId: null,
    userId: 'user-a',
    dirtyAt: '2026-08-23T12:00:00.000Z',
    lastSyncedAt: null
  }), false);
});

test('new local changes upload for the linked user while clean state downloads', () => {
  assert.equal(shouldUploadLocalState({
    cloudStateExists: true,
    cloudOwnerId: 'user-a',
    userId: 'user-a',
    dirtyAt: '2026-08-23T12:01:00.000Z',
    lastSyncedAt: '2026-08-23T12:00:00.000Z'
  }), true);
  assert.equal(shouldUploadLocalState({
    cloudStateExists: true,
    cloudOwnerId: 'user-a',
    userId: 'user-a',
    dirtyAt: '2026-08-23T12:00:00.000Z',
    lastSyncedAt: '2026-08-23T12:01:00.000Z'
  }), false);
});

test('local data owned by another account is never uploaded', () => {
  assert.equal(shouldUploadLocalState({
    cloudStateExists: false,
    cloudOwnerId: 'user-a',
    userId: 'user-b',
    dirtyAt: '2026-08-23T12:01:00.000Z',
    lastSyncedAt: '2026-08-23T12:00:00.000Z'
  }), false);
});
