import AsyncStorage from '@react-native-async-storage/async-storage';
import { mergeWorkoutHistory, shouldUploadLocalState } from '@/lib/cloudMerge';
import { supabase } from '@/lib/supabase';
import {
  loadActiveBuildWorkout,
  loadBuildProfile,
  loadWorkoutHistory,
  migrateBuildProfile,
  STORAGE_KEYS
} from '@/storage/appStorage';
import { CLOUD_METADATA_KEYS } from '@/storage/cloudMetadata';
import { CURRENT_WORKOUT_KEY, loadCurrentWorkout } from '@/storage/workoutStorage';
import { BuildProfile, BuildWorkoutPrescription, WorkoutHistoryEntry } from '@/types/build';
import { Database, Json } from '@/types/database';
import { WorkoutPlan } from '@/types/workout';

const CLOUD_SCHEMA_VERSION = 1;

type UserDataRow = Database['public']['Tables']['fitness_forge_user_data']['Row'];

interface LocalSnapshot {
  profile: BuildProfile | null;
  activeBuildWorkout: BuildWorkoutPrescription | null;
  currentForgeWorkout: WorkoutPlan | null;
  history: WorkoutHistoryEntry[];
}

export interface CloudSyncResult {
  syncedAt: string;
  uploadedLocalState: boolean;
  workoutCount: number;
  pendingLocalChanges: boolean;
}

function asJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function asObject<T>(value: Json | null): T | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as T : null;
}

function parseHistoryEntry(value: Json): WorkoutHistoryEntry | null {
  const candidate = asObject<WorkoutHistoryEntry>(value);
  if (!candidate || typeof candidate.id !== 'string' || typeof candidate.completedAt !== 'string') return null;
  if (candidate.source !== 'BUILD' && candidate.source !== 'FORGE') return null;
  return candidate;
}

async function loadLocalSnapshot(): Promise<LocalSnapshot> {
  const [profile, activeBuildWorkout, currentForgeWorkout, history] = await Promise.all([
    loadBuildProfile(),
    loadActiveBuildWorkout(),
    loadCurrentWorkout(),
    loadWorkoutHistory()
  ]);
  return { profile, activeBuildWorkout, currentForgeWorkout, history };
}

async function replaceLocalSnapshot(snapshot: LocalSnapshot): Promise<void> {
  const values: Array<[string, string]> = [[STORAGE_KEYS.history, JSON.stringify(snapshot.history)]];
  const removals: string[] = [];
  const assign = (key: string, value: unknown | null) => {
    if (value === null) removals.push(key);
    else values.push([key, JSON.stringify(value)]);
  };
  assign(STORAGE_KEYS.profile, snapshot.profile);
  assign(STORAGE_KEYS.activeBuildWorkout, snapshot.activeBuildWorkout);
  assign(CURRENT_WORKOUT_KEY, snapshot.currentForgeWorkout);
  await AsyncStorage.multiSet(values);
  if (removals.length) await AsyncStorage.multiRemove(removals);
}

function snapshotFromCloud(row: UserDataRow, history: WorkoutHistoryEntry[]): LocalSnapshot {
  return {
    profile: migrateBuildProfile(row.build_profile),
    activeBuildWorkout: asObject<BuildWorkoutPrescription>(row.active_build_workout),
    currentForgeWorkout: asObject<WorkoutPlan>(row.current_forge_workout),
    history
  };
}

export async function synchronizeCloudData(userId: string): Promise<CloudSyncResult> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const [local, ownerId, dirtyAt, lastSyncedAt, cloudStateResult, cloudHistoryResult] = await Promise.all([
    loadLocalSnapshot(),
    AsyncStorage.getItem(CLOUD_METADATA_KEYS.owner),
    AsyncStorage.getItem(CLOUD_METADATA_KEYS.dirtyAt),
    AsyncStorage.getItem(CLOUD_METADATA_KEYS.lastSyncedAt),
    supabase.from('fitness_forge_user_data').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('fitness_forge_workout_sessions').select('data').eq('user_id', userId).order('completed_at', { ascending: false }).limit(250)
  ]);

  if (cloudStateResult.error) throw cloudStateResult.error;
  if (cloudHistoryResult.error) throw cloudHistoryResult.error;
  if (ownerId && ownerId !== userId) {
    throw new Error('This device is linked to a different Fitness Forge account. Sign back into that account before changing accounts on this device.');
  }
  if (cloudStateResult.data && cloudStateResult.data.schema_version > CLOUD_SCHEMA_VERSION) {
    throw new Error('This cloud backup was created by a newer Fitness Forge version. Update the app before restoring it.');
  }

  const cloudHistory = (cloudHistoryResult.data ?? [])
    .map((row) => parseHistoryEntry(row.data))
    .filter((entry): entry is WorkoutHistoryEntry => entry !== null);
  const mergedHistory = mergeWorkoutHistory(local.history, cloudHistory);
  const uploadLocalState = shouldUploadLocalState({
    cloudStateExists: cloudStateResult.data !== null,
    cloudOwnerId: ownerId,
    userId,
    dirtyAt,
    lastSyncedAt
  });

  const cloudSnapshot = cloudStateResult.data ? snapshotFromCloud(cloudStateResult.data, mergedHistory) : null;
  const chosen: LocalSnapshot = uploadLocalState
    ? { ...local, history: mergedHistory }
    : cloudSnapshot ?? { profile: null, activeBuildWorkout: null, currentForgeWorkout: null, history: mergedHistory };
  chosen.history = mergedHistory;

  const stateUpsert = await supabase.from('fitness_forge_user_data').upsert({
    user_id: userId,
    schema_version: CLOUD_SCHEMA_VERSION,
    build_profile: chosen.profile ? asJson(chosen.profile) : null,
    active_build_workout: chosen.activeBuildWorkout ? asJson(chosen.activeBuildWorkout) : null,
    current_forge_workout: chosen.currentForgeWorkout ? asJson(chosen.currentForgeWorkout) : null
  }, { onConflict: 'user_id' });
  if (stateUpsert.error) throw stateUpsert.error;

  if (mergedHistory.length) {
    const historyUpsert = await supabase.from('fitness_forge_workout_sessions').upsert(
      mergedHistory.map((entry) => ({
        user_id: userId,
        id: entry.id,
        source: entry.source,
        completed_at: entry.completedAt,
        data: asJson(entry)
      })),
      { onConflict: 'user_id,id' }
    );
    if (historyUpsert.error) throw historyUpsert.error;
  }

  const syncedAt = new Date().toISOString();
  const latestDirtyAt = await AsyncStorage.getItem(CLOUD_METADATA_KEYS.dirtyAt);
  const pendingLocalChanges = latestDirtyAt !== dirtyAt;
  if (!pendingLocalChanges) await replaceLocalSnapshot(chosen);
  const metadata: Array<[string, string]> = [
    [CLOUD_METADATA_KEYS.owner, userId],
    [CLOUD_METADATA_KEYS.lastSyncedAt, syncedAt]
  ];
  if (!pendingLocalChanges) metadata.push([CLOUD_METADATA_KEYS.dirtyAt, syncedAt]);
  await AsyncStorage.multiSet(metadata);

  return { syncedAt, uploadedLocalState: uploadLocalState, workoutCount: mergedHistory.length, pendingLocalChanges };
}
