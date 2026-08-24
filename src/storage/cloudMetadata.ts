import AsyncStorage from '@react-native-async-storage/async-storage';

export const CLOUD_METADATA_KEYS = {
  owner: 'fitness_forge/cloud_owner_v1',
  dirtyAt: 'fitness_forge/cloud_dirty_at_v1',
  lastSyncedAt: 'fitness_forge/cloud_last_synced_at_v1'
} as const;

let syncTrigger: (() => void) | null = null;

export function registerCloudSyncTrigger(trigger: (() => void) | null): void {
  syncTrigger = trigger;
}

export async function markCloudDataDirty(): Promise<void> {
  await AsyncStorage.setItem(CLOUD_METADATA_KEYS.dirtyAt, new Date().toISOString());
  syncTrigger?.();
}
