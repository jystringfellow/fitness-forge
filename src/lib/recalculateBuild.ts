import { getBuildPushupPrescription } from '@/data/pushupProgram';
import { getNextPullupState } from '@/lib/pullupProgression';
import { recognizeStandardPushupPerformance } from '@/lib/pushupProgression';
import { BuildProfile, BuildWorkoutResult, CompletedExercise, WorkoutHistoryEntry } from '@/types/build';

function assistance(exercise: CompletedExercise, fallback: number): number {
  const completed = exercise.completedSets.filter((set) => set.status === 'completed');
  if (!completed.length) return fallback;
  return Math.max(0, ...completed
    .map((set) => set.actualAssistanceLb ?? set.targetAssistanceLb ?? fallback));
}

function ceiling(exercise: CompletedExercise): boolean {
  return !exercise.skipped && exercise.prescribedSets.length >= 3
    && exercise.completedSets.length === exercise.prescribedSets.length
    && exercise.completedSets.every((set) => set.status === 'completed' && set.actualReps >= 10);
}

export function recalculateBuildFromHistory(profile: BuildProfile, history: WorkoutHistoryEntry[], now = new Date().toISOString()): { profile: BuildProfile; summary: string[] } {
  // Retained history may be incomplete. Use recent evidence rather than replaying
  // every session from an invented baseline or advancing the weekly template again.
  const seen = new Set<string>();
  const results = history.filter((entry): entry is BuildWorkoutResult => {
    if (entry.source !== 'BUILD' || entry.status === 'skipped' || seen.has(entry.id)
      || !Number.isFinite(Date.parse(entry.completedAt)) || Date.parse(entry.completedAt) < Date.parse(profile.createdAt)) return false;
    seen.add(entry.id);
    return true;
  }).sort((a, b) => Date.parse(a.completedAt) - Date.parse(b.completedAt) || a.id.localeCompare(b.id));
  let next = { ...profile, updatedAt: now };
  const summary: string[] = [];
  if (profile.pullup.enabled) {
    const logs = results.flatMap((result) => result.exercises.filter((exercise) => exercise.kind === 'pull-up').map((exercise) => ({ result, exercise })));
    const last = logs.at(-1);
    const previous = logs.at(-2);
    if (last && last.exercise.prescribedSets.length) {
      const actualAssistance = assistance(last.exercise, profile.pullup.currentAssistanceLb);
      const confirmedPreviously = previous && ceiling(previous.exercise)
        && assistance(previous.exercise, profile.pullup.currentAssistanceLb) === actualAssistance;
      const seed = { ...profile.pullup,
        currentAssistanceLb: actualAssistance,
        targetReps: last.exercise.prescribedSets.map((set) => set.targetReps),
        ceilingConfirmations: confirmedPreviously ? 1 : 0,
        successfulSessionsAtCurrentAssistance: confirmedPreviously ? 1 : 0,
        sessionsCompleted: Math.max(0, profile.pullup.sessionsCompleted - 1) };
      const update = getNextPullupState(seed, last.exercise, last.result.completedAt);
      next = { ...next, pullup: { ...update.state, sessionsCompleted: profile.pullup.sessionsCompleted } };
      summary.push(`Pull-ups: ${profile.pullup.targetReps.join(' / ')} @ ${profile.pullup.currentAssistanceLb} lb → ${next.pullup.targetReps.join(' / ')} @ ${next.pullup.currentAssistanceLb} lb assistance.`, update.summary);
    } else summary.push('No pull-up results from this BUILD setup are saved. Current pull-up targets are retained.');
  }
  if (profile.pushup.enabled) {
    let pushup = profile.pushup;
    const latestAssessment = pushup.assessments.slice().sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt))[0];
    if (pushup.currentVariation === 'standard' && latestAssessment?.variation === 'standard') {
      pushup = { ...pushup, baselineMax: Math.max(pushup.baselineMax, latestAssessment.reps) };
    }
    const latestAssessmentAt = Math.max(0, ...pushup.assessments.map((item) => Date.parse(item.completedAt)).filter(Number.isFinite));
    for (const result of results) {
      for (const exercise of result.exercises.filter((item) => item.kind === 'push-up' || item.kind === 'assessment')) {
        if (Date.parse(result.completedAt) >= latestAssessmentAt) pushup = recognizeStandardPushupPerformance(pushup, exercise, result.completedAt);
      }
    }
    // Assessments are stored on the profile separately from workout history.
    const bestStandardReps = Math.max(pushup.bestStandardReps, ...pushup.assessments.filter((item) => item.variation === 'standard').map((item) => item.reps), 0);
    const completionDate = pushup.assessments.find((item) => item.variation === 'standard' && item.reps >= pushup.goalReps)?.completedAt ?? profile.updatedAt;
    pushup = { ...pushup, bestStandardReps,
      goalCompletedAt: bestStandardReps >= pushup.goalReps ? pushup.goalCompletedAt ?? completionDate : undefined };
    next = { ...next, pushup };
    const sets = getBuildPushupPrescription(pushup).sets;
    summary.push(`Push-ups: ${sets.map((set) => `${set.reps}${set.type === 'minimum' ? '+' : ''}`).join(' / ')} · ${pushup.currentVariation}.`,
      pushup.assessmentDue ? 'Your check-in stays available separately; it will not block these training sets.' : `Recorded standard best: ${bestStandardReps}. Goal: ${pushup.goalReps}.`);
  }
  return { profile: next, summary };
}
