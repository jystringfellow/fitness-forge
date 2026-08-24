import { useEffect } from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

export function useWorkoutWakeLock(active: boolean, tag: string): void {
  useEffect(() => {
    if (!active) return;
    void activateKeepAwakeAsync(tag).catch(() => {
      // A workout must remain usable if a platform refuses the wake lock.
    });
    return () => {
      void deactivateKeepAwake(tag).catch(() => {
        // The platform also releases the lock when the screen unmounts.
      });
    };
  }, [active, tag]);
}
