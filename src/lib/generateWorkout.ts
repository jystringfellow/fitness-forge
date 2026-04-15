import { CARDIO_LIBRARY, EXERCISES } from '@/data/exercises';
import {
  Attachment,
  ConcreteAttachment,
  Energy,
  Exercise,
  ExerciseTag,
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

const FOCUS_TAG_WEIGHTS: Record<Focus, Partial<Record<ExerciseTag, number>>> = {
  'full body': { 'full body': 3, athletic: 2, core: 1, push: 1, pull: 1, legs: 1 },
  'core + back': { core: 3, pull: 3, posterior: 2, posture: 2, 'anti-rotation': 2, recovery: 1 },
  endurance: { conditioning: 3, 'full body': 2, athletic: 2, pull: 1, push: 1, legs: 1 },
  'legs + power': { legs: 3, power: 3, posterior: 2, athletic: 2, balance: 1 },
  recovery: { recovery: 4, mobility: 3, stability: 2, posture: 2, core: 2, balance: 2 },
  sprint: { sprint: 4, power: 3, athletic: 3, conditioning: 2, posterior: 2, legs: 2 }
};

const ENERGY_TAG_WEIGHTS: Record<Energy, Partial<Record<ExerciseTag, number>>> = {
  low: { recovery: 3, stability: 2, balance: 2, posture: 2, mobility: 2, core: 1 },
  normal: { athletic: 1, core: 1, pull: 1, legs: 1, 'full body': 1 },
  high: { power: 3, athletic: 2, conditioning: 2, sprint: 2, plyo: 2, 'full body': 1 }
};

function getAttachmentPool(attachment: ConcreteAttachment): Exercise[] {
  return EXERCISES.filter((exercise) => exercise.attachment === attachment);
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function scoreAttachmentRecommendation(
  attachment: ConcreteAttachment,
  focus: Focus,
  energy: Energy
): number {
  const focusPool = getAttachmentPool(attachment).filter((exercise) => exercise.focus.includes(focus));
  if (!focusPool.length) {
    return Number.NEGATIVE_INFINITY;
  }

  const allTags = new Set(focusPool.flatMap((exercise) => exercise.tags));
  let score = focusPool.length * 20;

  if (focusPool.length >= 4) {
    score += 25;
  }

  score += Math.min(getAttachmentPool(attachment).length, 5);
  score += allTags.size * 3;

  for (const exercise of focusPool) {
    for (const tag of exercise.tags) {
      score += FOCUS_TAG_WEIGHTS[focus][tag] ?? 0;
      score += ENERGY_TAG_WEIGHTS[energy][tag] ?? 0;
    }
  }

  return score;
}

function pickAttachment(
  requested: Attachment,
  focus: Focus,
  energy: Energy
): ConcreteAttachment {
  if (requested !== 'recommended') {
    return requested;
  }

  const attachments = [...new Set(EXERCISES.map((exercise) => exercise.attachment))] as ConcreteAttachment[];
  const scored = attachments
    .map((attachment) => ({
      attachment,
      score: scoreAttachmentRecommendation(attachment, focus, energy)
    }))
    .filter((entry) => Number.isFinite(entry.score));

  if (!scored.length) {
    return pickRandom(attachments);
  }

  const bestScore = Math.max(...scored.map((entry) => entry.score));
  const topAttachments = scored
    .filter((entry) => entry.score === bestScore)
    .map((entry) => entry.attachment);

  return pickRandom(topAttachments);
}

function pickMainExercises(attachment: ConcreteAttachment, focus: Focus): Exercise[] {
  const pool = getAttachmentPool(attachment).filter((exercise) => exercise.focus.includes(focus));
  const fallbackPool = getAttachmentPool(attachment);
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
  const attachment = pickAttachment(input.attachment, input.focus, input.energy);
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
