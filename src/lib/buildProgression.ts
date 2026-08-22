import { getNextPullupState } from '@/lib/pullupProgression';
import { getNextPushupState } from '@/lib/pushupProgression';
import { BuildProfile, BuildWorkoutResult } from '@/types/build';

export function advanceBuildProfile(profile: BuildProfile, result: BuildWorkoutResult): BuildProfile {
  if (result.status === 'skipped') {
    return { ...profile, updatedAt: result.completedAt };
  }

  let next = {
    ...profile,
    updatedAt: result.completedAt,
    nextTemplateIndex: (profile.nextTemplateIndex + 1) % 3,
    accessories: { ...profile.accessories }
  };

  const pullup = result.exercises.find((exercise) => exercise.kind === 'pull-up');
  if (pullup && profile.pullup.enabled) {
    next = { ...next, pullup: getNextPullupState(profile.pullup, pullup, result.completedAt).state };
  }

  const pushup = result.exercises.find((exercise) => exercise.kind === 'push-up' || exercise.kind === 'assessment');
  if (pushup && profile.pushup.enabled) {
    next = { ...next, pushup: getNextPushupState(profile.pushup, pushup, result.completedAt).state };
  }

  result.exercises.filter((exercise) => exercise.kind === 'accessory').forEach((exercise) => {
    const current = next.accessories[exercise.exerciseId];
    if (!current || exercise.skipped) return;
    const allTargets = exercise.completedSets.length === exercise.prescribedSets.length
      && exercise.completedSets.every((set) => set.status === 'completed' && set.actualReps >= set.targetReps);
    const actualLoad = exercise.completedSets.find((set) => set.actualLoadLb !== undefined)?.actualLoadLb ?? current.loadLb;
    const successfulSessions = allTargets ? current.successfulSessions + 1 : 0;
    next.accessories[exercise.exerciseId] = {
      loadLb: successfulSessions >= 3 && actualLoad > 0 ? actualLoad + 5 : actualLoad,
      successfulSessions: successfulSessions >= 3 ? 0 : successfulSessions
    };
  });

  return next;
}

export function getProgressionSummaries(profile: BuildProfile, result: BuildWorkoutResult): string[] {
  const summaries: string[] = [];
  const pullup = result.exercises.find((exercise) => exercise.kind === 'pull-up');
  const pushup = result.exercises.find((exercise) => exercise.kind === 'push-up' || exercise.kind === 'assessment');
  if (pullup && profile.pullup.enabled) summaries.push(getNextPullupState(profile.pullup, pullup, result.completedAt).summary);
  if (pushup && profile.pushup.enabled) summaries.push(getNextPushupState(profile.pushup, pushup, result.completedAt).summary);
  return summaries;
}
