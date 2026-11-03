import { ForgeSetResult, WorkoutIntervalStep } from '@/types/workout';
import { getRestAudioCue } from '@/lib/buildWorkoutFlow';

export function hasLoggedLinkedSet(step: WorkoutIntervalStep | null, results: ForgeSetResult[]): boolean {
  if (!step?.linkedSet) return false;
  return results.some((item) => item.exerciseId === step.linkedSet?.exerciseId && item.setIndex === step.linkedSet?.setIndex);
}

export function shouldWaitForLinkedLog(step: WorkoutIntervalStep | null, results: ForgeSetResult[]): boolean {
  return Boolean(step?.isRest && step.linkedSet && !hasLoggedLinkedSet(step, results));
}

export function nextStepAnnouncement(next: WorkoutIntervalStep, afterRest: WorkoutIntervalStep | null): string | null {
  const isRestInterval = (step: WorkoutIntervalStep) => step.isRest
    && (Boolean(step.linkedSet) || !step.exerciseName || /\b(?:rest|reset)\b/i.test(step.exerciseName));
  const upcoming = isRestInterval(next) ? afterRest : next;
  return upcoming?.exerciseName && !isRestInterval(upcoming) ? `Next: ${upcoming.exerciseName}.` : null;
}

export const NEXT_STEP_ANNOUNCEMENT_LEAD_SECS = 10;

export function shouldPlayCountdownCue(current: WorkoutIntervalStep | null, next: WorkoutIntervalStep | null, remaining: number, running: boolean): boolean {
  return Boolean(current && !current.isPrompt && current.durationSecs > 0
    && (!current.isRest || (next?.exerciseName && !next.isRest))
    && getRestAudioCue(remaining, !running) === 'countdown');
}

export function shouldPlayRestWarningCue(current: WorkoutIntervalStep | null, next: WorkoutIntervalStep | null, remaining: number, running: boolean): boolean {
  return Boolean(running && current?.isRest && !current.isPrompt && current.durationSecs >= NEXT_STEP_ANNOUNCEMENT_LEAD_SECS
    && next?.exerciseName && !next.isRest && remaining === NEXT_STEP_ANNOUNCEMENT_LEAD_SECS);
}

export function shouldAnnounceNextStep(current: WorkoutIntervalStep | null, next: WorkoutIntervalStep | null, remaining: number, running: boolean): boolean {
  return Boolean(running && current && next && !current.isRest && !current.isPrompt
    && current.durationSecs >= NEXT_STEP_ANNOUNCEMENT_LEAD_SECS
    && remaining === NEXT_STEP_ANNOUNCEMENT_LEAD_SECS);
}

export function displayStepText(step: WorkoutIntervalStep): string {
  if (step.isRest && !step.isPrompt && /\breset\b/i.test(step.text)) {
    return `Rest for ${step.durationSecs}s${step.linkedSet ? ` · log ${step.exerciseName ?? 'set'} reps` : ''}`;
  }
  return step.text;
}
