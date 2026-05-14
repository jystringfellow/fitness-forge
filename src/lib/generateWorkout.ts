import { CARDIO_LIBRARY, EXERCISES } from '@/data/exercises';
import {
  Attachment,
  ConcreteAttachment,
  Energy,
  Exercise,
  ExerciseTag,
  ExerciseType,
  Focus,
  GenerateWorkoutInput,
  TimeOption,
  WorkoutPlan,
  WorkoutBlockItem,
  WorkoutIntervalStep
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

interface ParsedCardioSegment {
  exercise: string;
  durationSecs: number;
  reps?: number;
  isRest: boolean;
}

interface ParsedCardioSequence {
  totalRounds: number;
  segments: ParsedCardioSegment[];
}

function isRestLikeExercise(exercise: string): boolean {
  return /\b(easy|walk|rest|reset|recovery|mobility|nasal-breath)\b/i.test(exercise);
}

function formatTimedExercise(seconds: number, exercise: string, round: number, totalRounds: number): string {
  return `${seconds}s ${exercise} ${round}/${totalRounds}`;
}

function formatRepExercise(reps: number, exercise: string, round: number, totalRounds: number): string {
  return `${reps} ${exercise} ${round}/${totalRounds}`;
}

function parseCardioSequence(text: string): ParsedCardioSequence {
  const leadingRoundsMatch = text.match(/(\d+)\s+rounds?\s+of/i);
  const trailingRepeatMatch = text.match(/\s+x\s*(\d+)\s*$/i);
  const repeatMatch = leadingRoundsMatch ?? trailingRepeatMatch;
  const totalRounds = repeatMatch ? parseInt(repeatMatch[1], 10) : 1;
  const cleanedText = text
    .replace(/\s*x\s*\d+\s*$/i, '')
    .replace(/^\s*\d+\s+rounds?\s+of\s+/i, '')
    .replace(/[.]+$/g, '')
    .trim();

  const segments = cleanedText
    .split(/\s+\+\s+/)
    .map((segmentText): ParsedCardioSegment => {
      const segment = segmentText.trim();
      const secondsMatch = segment.match(/^(\d+)s\s+(.+)$/i);
      if (secondsMatch) {
        const exercise = secondsMatch[2].trim();
        return {
          exercise,
          durationSecs: parseInt(secondsMatch[1], 10),
          isRest: isRestLikeExercise(exercise)
        };
      }

      const minutesMatch = segment.match(/^(\d+)\s*min\s+(.+)$/i);
      if (minutesMatch) {
        const exercise = minutesMatch[2].trim();
        return {
          exercise,
          durationSecs: parseInt(minutesMatch[1], 10) * 60,
          isRest: isRestLikeExercise(exercise)
        };
      }

      const repsMatch = segment.match(/^(\d+)\s+(.+)$/i);
      if (repsMatch) {
        const exercise = repsMatch[2].trim();
        return {
          exercise,
          durationSecs: 0,
          reps: parseInt(repsMatch[1], 10),
          isRest: isRestLikeExercise(exercise)
        };
      }

      return {
        exercise: segment,
        durationSecs: 0,
        isRest: true
      };
    });

  return { totalRounds, segments };
}

function buildCardioIntervalSteps(cardioOptions: string[]): WorkoutIntervalStep[] {
  const sequences = cardioOptions.map(parseCardioSequence);
  const maxRounds = Math.max(...sequences.map((sequence) => sequence.totalRounds), 0);
  const intervalSteps: WorkoutIntervalStep[] = [];

  for (let round = 1; round <= maxRounds; round += 1) {
    sequences.forEach((sequence) => {
      if (round > sequence.totalRounds) {
        return;
      }

      sequence.segments.forEach((segment) => {
        const label = segment.reps
          ? formatRepExercise(segment.reps, segment.exercise, round, sequence.totalRounds)
          : formatTimedExercise(segment.durationSecs, segment.exercise, round, sequence.totalRounds);

        intervalSteps.push({
          text: label,
          durationSecs: segment.durationSecs,
          isRest: segment.isRest,
          round,
          totalRounds: sequence.totalRounds,
          exerciseName: segment.exercise,
          reps: segment.reps,
          section: 'cardio'
        });
      });
    });
  }

  return intervalSteps;
}

function buildOptionalFinisherSteps(note?: string): WorkoutIntervalStep[] {
  if (!note?.startsWith('Optional finisher:')) {
    return [];
  }

  const finisherText = note.replace(/^Optional finisher:\s*/i, '').trim();
  const finisher = parseCardioSequence(finisherText);
  const intervalSteps: WorkoutIntervalStep[] = [];

  for (let round = 1; round <= finisher.totalRounds; round += 1) {
    finisher.segments.forEach((segment) => {
      const label = segment.reps
        ? formatRepExercise(segment.reps, segment.exercise, round, finisher.totalRounds)
        : formatTimedExercise(segment.durationSecs, segment.exercise, round, finisher.totalRounds);

      intervalSteps.push({
        text: label,
        durationSecs: segment.durationSecs,
        isRest: segment.isRest,
        round,
        totalRounds: finisher.totalRounds,
        exerciseName: segment.exercise,
        reps: segment.reps,
        section: 'finisher'
      });
    });
  }

  return intervalSteps;
}

function buildIntervalSteps(
  cardioOptions: string[],
  mainBlock: WorkoutPlan['mainBlock'],
  note?: string
): WorkoutIntervalStep[] {
  const intervalSteps: WorkoutIntervalStep[] = [];
  const finisherSteps = buildOptionalFinisherSteps(note);

  intervalSteps.push(...buildCardioIntervalSteps(cardioOptions));
  intervalSteps.push({
    text: 'Ready for Main Block?',
    durationSecs: 0,
    isRest: true,
    section: 'main',
    isPrompt: true,
    actionLabel: 'Yes'
  });

  for (let round = 1; round <= mainBlock.rounds; round += 1) {
    mainBlock.exercises.forEach((exercise, exerciseIndex) => {
      const isLastExercise = exerciseIndex === mainBlock.exercises.length - 1;
      const isLastRound = round === mainBlock.rounds;

      intervalSteps.push({
        text: `Round ${round}/${mainBlock.rounds}: ${exercise.name}`,
        durationSecs: mainBlock.workSeconds,
        isRest: false,
        round,
        totalRounds: mainBlock.rounds,
        exerciseName: exercise.name,
        section: 'main'
      });

      if (!isLastExercise || !isLastRound) {
        intervalSteps.push({
          text: `${mainBlock.restSeconds}s rest`,
          durationSecs: mainBlock.restSeconds,
          isRest: true,
          round,
          totalRounds: mainBlock.rounds,
          section: 'main'
        });
      }
    });
  }

  if (finisherSteps.length) {
    intervalSteps.push({
      text: 'Congrats on finishing the main block! Want to do the optional finisher?',
      durationSecs: 0,
      isRest: true,
      section: 'finisher',
      isPrompt: true,
      actionLabel: 'Yes',
      skipLabel: 'No thanks'
    });
    intervalSteps.push(...finisherSteps);
  }

  return intervalSteps;
}

export function generateWorkoutPlan(
  input: GenerateWorkoutInput,
  includeIntervalSteps = false
): WorkoutPlan {
  const split = TIME_SPLIT[input.time];
  const intervals = ENERGY_TO_WORK_REST[input.energy];
  const attachment = pickAttachment(input.attachment, input.focus, input.energy);
  const mainExercises = pickMainExercises(attachment, input.focus);
  const cardioOptions = CARDIO_LIBRARY[input.focus] ?? CARDIO_LIBRARY['full body'];

  const parseCardioOption = (text: string): WorkoutBlockItem => {
    const isRep = text.match(/^\d+\s+(?!min\b)[a-z]/i);

    if (isRep) {
      const repMatch = text.match(/(\d+)\s+([a-z]+)/i);
      if (repMatch) {
        return {
          text,
          type: 'rep',
          value: parseInt(repMatch[1], 10)
        };
      }
    }

    let totalTime = 0;
    const timeParts = text.match(/(\d+)s/g);
    if (timeParts) {
      totalTime = timeParts.reduce((sum, part) => sum + parseInt(part.match(/(\d+)s/)?.[1] || '0', 10), 0);
    }

    const repeatMatch = text.match(/x\s*(\d+)/i);
    const repeats = repeatMatch ? parseInt(repeatMatch[1], 10) : 1;
    const totalDuration = totalTime * repeats;

    return {
      text,
      type: 'time',
      value: totalDuration
    };
  };

  const cardioBlock: WorkoutBlockItem[] = [];
  cardioBlock.push({ text: `${split.cardio} min cardio/plyo`, type: 'time', value: split.cardio * 60 });

  cardioOptions.forEach((option) => {
    cardioBlock.push(parseCardioOption(option));
  });

  const mainBlock: WorkoutPlan['mainBlock'] = {
    rounds: intervals.rounds,
    workSeconds: intervals.work,
    restSeconds: intervals.rest,
    exercises: mainExercises
  };
  const note =
    input.focus === 'recovery'
      ? 'Finish with 2-3 minutes of slow breathing and thoracic rotation.'
      : 'Optional finisher: 2 rounds of 20s fast feet + 40s walk.';
  const intervalSteps = includeIntervalSteps ? buildIntervalSteps(cardioOptions, mainBlock, note) : [];

  return {
    title: `${input.time}-min ${input.focus} forge`,
    createdAt: new Date().toISOString(),
    input: { ...input, attachment },
    cardioBlock,
    intervalSteps,
    mainBlock,
    note
  };
}

export function generateWorkout(
  input: GenerateWorkoutInput,
  includeIntervalSteps = false
): WorkoutPlan {
  return generateWorkoutPlan(input, includeIntervalSteps);
}
