import { WorkoutHistoryEntry } from '@/types/build';

export const MAX_LOCAL_HISTORY = 250;

export function mergeWorkoutHistory(
  local: WorkoutHistoryEntry[],
  cloud: WorkoutHistoryEntry[]
): WorkoutHistoryEntry[] {
  const byId = new Map<string, WorkoutHistoryEntry>();
  for (const entry of cloud) byId.set(entry.id, entry);
  for (const entry of local) byId.set(entry.id, entry);
  return [...byId.values()]
    .sort((left, right) => right.completedAt.localeCompare(left.completedAt))
    .slice(0, MAX_LOCAL_HISTORY);
}

export function shouldUploadLocalState({
  cloudStateExists,
  cloudOwnerId,
  userId,
  dirtyAt,
  lastSyncedAt
}: {
  cloudStateExists: boolean;
  cloudOwnerId: string | null;
  userId: string;
  dirtyAt: string | null;
  lastSyncedAt: string | null;
}): boolean {
  if (cloudOwnerId && cloudOwnerId !== userId) return false;
  if (!cloudStateExists) return true;
  if (cloudOwnerId !== userId || !dirtyAt) return false;
  return !lastSyncedAt || dirtyAt > lastSyncedAt;
}
