import { CARDIO_LIBRARY, EXERCISES } from '@/data/exercises';
import {
  Attachment,
  Exercise,
  Focus,
  GenerateWorkoutInput,
  TimeOption,
  WorkoutPlan
} from '@/types/workout';

const TIME_SPLIT: Record<TimeOption, { cardio: number; main: number }> = {
  15: { cardio: 5, main: 10 },
  20: { cardio: 5, main: 15 },
  25: { cardio: 7, main: 18 },
  30: { cardio: 10, main: 20 }
};

const ENERGY_TO_WORK_REST = {
  low: { work: 35, rest: 25, rounds: 3 },
  normal: { work: 40, rest: 20, rounds: 3 },
  high: { work: 45, rest: 15, rounds: 4 }
} as const;

function pickAttachment(requested: Attachment, focus: Focus): Exclude<Attachment, 'auto'> {
  if (requested !== 'auto') {
    return requested;
  }

  const ranked: Exclude<Attachment, 'auto'>[] = ['rope', 'strap', 'handles', 'bar'];
  const best = ranked.find((attachment) =>
    EXERCISES.some((exercise) => exercise.attachment === attachment && exercise.focus.includes(focus))
  );
  return best ?? 'rope';
}

function pickMainExercises(attachment: Exclude<Attachment, 'auto'>, focus: Focus): Exercise[] {
  const pool = EXERCISES.filter(
    (exercise) => exercise.attachment === attachment && exercise.focus.includes(focus)
  );
  const fallbackPool = EXERCISES.filter((exercise) => exercise.attachment === attachment);
  const targetPool = pool.length >= 4 ? pool : fallbackPool;

  const picks: Exercise[] = [];
  const tagOrder: Array<Exercise['tags'][number]> = ['pull', 'legs', 'core', 'athletic'];

  for (const tag of tagOrder) {
    const match = targetPool.find(
      (exercise) => exercise.tags.includes(tag) && !picks.some((picked) => picked.id === exercise.id)
    );
    if (match) {
      picks.push(match);
    }
  }

  while (picks.length < Math.min(5, targetPool.length)) {
    const extra = targetPool.find((exercise) => !picks.some((picked) => picked.id === exercise.id));
    if (!extra) {
      break;
    }
    picks.push(extra);
  }

  return picks.slice(0, 5);
}

export function generateWorkout(input: GenerateWorkoutInput): WorkoutPlan {
  const split = TIME_SPLIT[input.time];
  const intervals = ENERGY_TO_WORK_REST[input.energy];
  const attachment = pickAttachment(input.attachment, input.focus);
  const mainExercises = pickMainExercises(attachment, input.focus);
  const cardioOptions = CARDIO_LIBRARY[input.focus] ?? CARDIO_LIBRARY['full body'];

  return {
    title: `${input.time}-min ${input.focus} forge`,
    createdAt: new Date().toISOString(),
    input: { ...input, attachment },
    cardioBlock: [
      `${split.cardio} min cardio/plyo`,
      cardioOptions[0],
      cardioOptions[1] ?? 'Easy cyclical movement'
    ],
    mainBlock: {
      rounds: intervals.rounds,
      workSeconds: intervals.work,
      restSeconds: intervals.rest,
      exercises: mainExercises
    },
    note:
      input.focus === 'recovery'
        ? 'Finish with 2-3 minutes of slow breathing and thoracic rotation.'
        : 'Optional finisher: 2 rounds of 20s fast feet + 40s walk.'
  };
}
