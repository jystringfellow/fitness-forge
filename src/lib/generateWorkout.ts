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

const FOCUS_EXERCISE_TAG_ORDER: Record<Focus, ExerciseTag[]> = {
  'full body': ['pull', 'legs', 'push', 'core', 'athletic', 'posterior'],
  'core + back': ['pull', 'core', 'anti-rotation', 'posterior', 'posture', 'athletic'],
  endurance: ['conditioning', 'full body', 'athletic', 'pull', 'legs', 'push'],
  'legs + power': ['legs', 'power', 'posterior', 'athletic', 'balance', 'core'],
  recovery: ['recovery', 'mobility', 'stability', 'posture', 'core', 'balance'],
  sprint: ['sprint', 'power', 'athletic', 'conditioning', 'legs', 'posterior']
};

const WORK_PROMPTS = [
  'smooth reps',
  'stay tall',
  'control the return',
  'own the pace',
  'brace and breathe',
  'clean form first'
];

const REST_PROMPTS = [
  'shake it out',
  'breathe low',
  'reset your stance',
  'quick sip if needed',
  'loosen your shoulders',
  'find the next setup'
];

const FINISHER_LIBRARY: Record<Energy, string[]> = {
  low: [
    '2 rounds of 20s tall march + 40s walk',
    '2 rounds of 30s low pogo + 30s mobility reset',
    '1 round of 45s steady fast feet + 45s walk'
  ],
  normal: [
    '2 rounds of 20s fast feet + 40s walk',
    '2 rounds of 30s skater steps + 30s walk',
    '3 rounds of 15s pogo hops + 45s reset'
  ],
  high: [
    '3 rounds of 20s fast feet + 20s squat jumps + 20s walk',
    '3 rounds of 15s hard high-knees + 15s lateral shuffle + 30s walk',
    '2 rounds of 30s pogo hops + 30s fast feet'
  ]
};

type WorkoutFormat = 'steady' | 'wave' | 'ladder' | 'surge';

function getAttachmentPool(attachment: ConcreteAttachment): Exercise[] {
  return EXERCISES.filter((exercise) => exercise.attachment === attachment);
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function pickWeightedRandom<T>(items: Array<{ item: T; weight: number }>): T {
  const totalWeight = items.reduce((sum, entry) => sum + entry.weight, 0);

  if (totalWeight <= 0) {
    return pickRandom(items).item;
  }

  let threshold = Math.random() * totalWeight;

  for (const entry of items) {
    threshold -= entry.weight;
    if (threshold <= 0) {
      return entry.item;
    }
  }

  return items[items.length - 1].item;
}

function clampToFiveSeconds(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value / 5) * 5));
}

function pickWorkoutFormat(energy: Energy, focus: Focus): WorkoutFormat {
  if (focus === 'recovery') {
    return pickWeightedRandom<WorkoutFormat>([
      { item: 'steady', weight: 3 },
      { item: 'wave', weight: 2 }
    ]);
  }

  if (energy === 'high') {
    return pickWeightedRandom<WorkoutFormat>([
      { item: 'surge', weight: 3 },
      { item: 'ladder', weight: 3 },
      { item: 'wave', weight: 2 },
      { item: 'steady', weight: 1 }
    ]);
  }

  if (energy === 'low') {
    return pickWeightedRandom<WorkoutFormat>([
      { item: 'wave', weight: 3 },
      { item: 'steady', weight: 2 },
      { item: 'ladder', weight: 1 }
    ]);
  }

  return pickWeightedRandom<WorkoutFormat>([
    { item: 'wave', weight: 3 },
    { item: 'ladder', weight: 2 },
    { item: 'steady', weight: 2 },
    { item: 'surge', weight: 1 }
  ]);
}

function buildRoundIntervals(
  base: (typeof ENERGY_TO_WORK_REST)[Energy],
  format: WorkoutFormat
): NonNullable<WorkoutPlan['mainBlock']['roundIntervals']> {
  const surgeRound = Math.floor(Math.random() * base.rounds) + 1;

  return Array.from({ length: base.rounds }, (_, index) => {
    const round = index + 1;
    let label = 'Steady round';
    let workMultiplier = 1;
    let restMultiplier = 1;

    if (format === 'wave') {
      const pattern = [
        { label: 'Build round', work: 0.85, rest: 1.25 },
        { label: 'Push round', work: 1.1, rest: 0.8 },
        { label: 'Control round', work: 0.95, rest: 1 },
        { label: 'Finish round', work: 1.2, rest: 0.75 }
      ][index % 4];
      label = pattern.label;
      workMultiplier = pattern.work;
      restMultiplier = pattern.rest;
    }

    if (format === 'ladder') {
      label = round === base.rounds ? 'Top rung' : `Rung ${round}`;
      workMultiplier = 0.85 + index * 0.12;
      restMultiplier = 1.2 - index * 0.1;
    }

    if (format === 'surge') {
      const isSurge = round === surgeRound;
      label = isSurge ? 'Surge round' : 'Cruise round';
      workMultiplier = isSurge ? 1.25 : 0.95;
      restMultiplier = isSurge ? 0.75 : 1.05;
    }

    return {
      label,
      workSeconds: clampToFiveSeconds(base.work * workMultiplier, 20, 60),
      restSeconds: clampToFiveSeconds(base.rest * restMultiplier, 10, 40)
    };
  });
}

function formatWorkoutFormat(format: WorkoutFormat): string {
  return `${format[0].toUpperCase()}${format.slice(1)} intervals`;
}

function pickCardioOptions(focus: Focus, targetDurationSecs: number): string[] {
  const focusOptions = CARDIO_LIBRARY[focus] ?? CARDIO_LIBRARY['full body'];
  const timedOptions = focusOptions.filter((option) => {
    const sequence = parseCardioSequence(option);
    return sequence.segments.every((segment) => segment.durationSecs > 0);
  });
  const fallbackOptions = CARDIO_LIBRARY['full body'].filter((option) => {
    const sequence = parseCardioSequence(option);
    return sequence.segments.every((segment) => segment.durationSecs > 0);
  });
  const options = shuffle(timedOptions.length ? timedOptions : fallbackOptions);
  const picks: string[] = [];
  let selectedDurationSecs = 0;

  for (const option of options) {
    picks.push(option);
    selectedDurationSecs += getCardioSequenceDurationSecs(parseCardioSequence(option));

    if (selectedDurationSecs >= targetDurationSecs) {
      break;
    }
  }

  return picks;
}

function pickFinisher(energy: Energy, focus: Focus): string {
  if (focus === 'recovery') {
    return pickRandom([
      'Finish with 2-3 minutes of slow breathing and thoracic rotation.',
      'Finish with 2 minutes of nasal breathing and easy hip mobility.',
      'Finish with a slow walk until your breathing fully settles.'
    ]);
  }

  return `Optional finisher: ${pickRandom(FINISHER_LIBRARY[energy])}.`;
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
  const strongCutoff = bestScore > 0 ? bestScore * 0.85 : bestScore;
  const strongAttachments = scored.filter((entry) => entry.score >= strongCutoff);
  const lowestStrongScore = Math.min(...strongAttachments.map((entry) => entry.score));

  return pickWeightedRandom(
    strongAttachments.map((entry) => ({
      item: entry.attachment,
      weight: entry.score - lowestStrongScore + 1
    }))
  );
}

function pickMainExercises(attachment: ConcreteAttachment, focus: Focus): Exercise[] {
  const pool = getAttachmentPool(attachment).filter((exercise) => exercise.focus.includes(focus));
  const fallbackPool = getAttachmentPool(attachment);
  const targetPool = pool.length >= 4 ? pool : fallbackPool;
  const shuffledPool = shuffle(targetPool);

  const picks: Exercise[] = [];
  const tagOrder = shuffle(FOCUS_EXERCISE_TAG_ORDER[focus]);

  for (const tag of tagOrder) {
    const matches = shuffledPool.filter(
      (exercise) => exercise.tags.includes(tag) && !picks.some((picked) => picked.id === exercise.id)
    );
    const match = matches.length ? pickRandom(matches) : null;
    if (match) {
      picks.push(match);
    }

    if (picks.length >= Math.min(5, targetPool.length)) {
      break;
    }
  }

  const remaining = shuffle(targetPool.filter((exercise) => !picks.some((picked) => picked.id === exercise.id)));
  picks.push(...remaining.slice(0, Math.min(5, targetPool.length) - picks.length));

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

function getCardioSequenceDurationSecs(sequence: ParsedCardioSequence): number {
  const roundDurationSecs = sequence.segments.reduce((sum, segment) => sum + segment.durationSecs, 0);
  return roundDurationSecs * sequence.totalRounds;
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

function buildCardioIntervalSteps(
  cardioOptions: string[],
  targetDurationSecs: number
): WorkoutIntervalStep[] {
  const sequences = cardioOptions.map(parseCardioSequence);
  const maxRounds = Math.max(...sequences.map((sequence) => sequence.totalRounds), 0);
  const candidateSteps: WorkoutIntervalStep[] = [];

  for (let round = 1; round <= maxRounds; round += 1) {
    sequences.forEach((sequence) => {
      if (round > sequence.totalRounds) {
        return;
      }

      sequence.segments.forEach((segment) => {
        const label = segment.reps
          ? formatRepExercise(segment.reps, segment.exercise, round, sequence.totalRounds)
          : formatTimedExercise(segment.durationSecs, segment.exercise, round, sequence.totalRounds);

        candidateSteps.push({
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

  const intervalSteps: WorkoutIntervalStep[] = [];
  let remainingDurationSecs = targetDurationSecs;

  for (const step of candidateSteps) {
    if (remainingDurationSecs <= 0) {
      break;
    }

    if (step.durationSecs <= 0) {
      continue;
    }

    const durationSecs = Math.min(step.durationSecs, remainingDurationSecs);
    intervalSteps.push({
      ...step,
      durationSecs,
      text:
        durationSecs === step.durationSecs || !step.exerciseName || !step.round || !step.totalRounds
          ? step.text
          : formatTimedExercise(durationSecs, step.exerciseName, step.round, step.totalRounds)
    });
    remainingDurationSecs -= durationSecs;
  }

  return intervalSteps;
}

function getMainBlockDurationSecs(
  roundIntervals: NonNullable<WorkoutPlan['mainBlock']['roundIntervals']>,
  exerciseCount: number
): number {
  return roundIntervals.reduce((sum, interval, index) => {
    const restCount = index === roundIntervals.length - 1 ? Math.max(0, exerciseCount - 1) : exerciseCount;
    return sum + interval.workSeconds * exerciseCount + interval.restSeconds * restCount;
  }, 0);
}

function fitRoundIntervalsToBudget(
  roundIntervals: NonNullable<WorkoutPlan['mainBlock']['roundIntervals']>,
  exerciseCount: number,
  targetDurationSecs: number
): NonNullable<WorkoutPlan['mainBlock']['roundIntervals']> {
  const currentDurationSecs = getMainBlockDurationSecs(roundIntervals, exerciseCount);
  if (!currentDurationSecs || !exerciseCount) {
    return roundIntervals;
  }

  const scale = targetDurationSecs / currentDurationSecs;
  const fittedIntervals = roundIntervals.map((interval) => ({
    ...interval,
    workSeconds: Math.max(10, Math.round(interval.workSeconds * scale)),
    restSeconds: Math.max(5, Math.round(interval.restSeconds * scale))
  }));
  const lastInterval = fittedIntervals[fittedIntervals.length - 1];
  const finalRoundRestCount = Math.max(0, exerciseCount - 1);

  if (lastInterval && finalRoundRestCount) {
    const restAdjustment = Math.round(
      (targetDurationSecs - getMainBlockDurationSecs(fittedIntervals, exerciseCount)) / finalRoundRestCount
    );
    lastInterval.restSeconds = Math.max(1, lastInterval.restSeconds + restAdjustment);
  }

  if (lastInterval) {
    const workAdjustment = Math.round(
      (targetDurationSecs - getMainBlockDurationSecs(fittedIntervals, exerciseCount)) / exerciseCount
    );
    lastInterval.workSeconds = Math.max(10, lastInterval.workSeconds + workAdjustment);
  }

  return fittedIntervals;
}

function buildCardioBlock(
  targetDurationMins: number,
  intervalSteps: WorkoutIntervalStep[]
): WorkoutBlockItem[] {
  const exerciseNames = [
    ...new Set(intervalSteps.map((step) => step.exerciseName).filter((name): name is string => Boolean(name)))
  ];

  return [
    {
      text: `${targetDurationMins} min cardio/plyo`,
      type: 'time',
      value: targetDurationMins * 60
    },
    {
      text: exerciseNames.join(' + '),
      type: 'time',
      value: targetDurationMins * 60
    }
  ];
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
  cardioSteps: WorkoutIntervalStep[],
  mainBlock: WorkoutPlan['mainBlock'],
  note?: string
): WorkoutIntervalStep[] {
  const intervalSteps: WorkoutIntervalStep[] = [];
  const finisherSteps = buildOptionalFinisherSteps(note);

  intervalSteps.push(...cardioSteps);
  intervalSteps.push({
    text: `Ready for ${mainBlock.format ?? 'the main block'}?`,
    durationSecs: 0,
    isRest: true,
    section: 'main',
    isPrompt: true,
    actionLabel: 'Yes'
  });

  for (let round = 1; round <= mainBlock.rounds; round += 1) {
    const roundInterval = mainBlock.roundIntervals?.[round - 1] ?? {
      label: `Round ${round}`,
      workSeconds: mainBlock.workSeconds,
      restSeconds: mainBlock.restSeconds
    };

    mainBlock.exercises.forEach((exercise, exerciseIndex) => {
      const isLastExercise = exerciseIndex === mainBlock.exercises.length - 1;
      const isLastRound = round === mainBlock.rounds;

      intervalSteps.push({
        text: `${roundInterval.label} ${round}/${mainBlock.rounds}: ${exercise.name} - ${pickRandom(WORK_PROMPTS)}`,
        durationSecs: roundInterval.workSeconds,
        isRest: false,
        round,
        totalRounds: mainBlock.rounds,
        exerciseName: exercise.name,
        section: 'main'
      });

      if (!isLastExercise || !isLastRound) {
        intervalSteps.push({
          text: `${roundInterval.restSeconds}s reset - ${pickRandom(REST_PROMPTS)}`,
          durationSecs: roundInterval.restSeconds,
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
  const workoutFormat = pickWorkoutFormat(input.energy, input.focus);
  const attachment = pickAttachment(input.attachment, input.focus, input.energy);
  const mainExercises = pickMainExercises(attachment, input.focus);
  const roundIntervals = fitRoundIntervalsToBudget(
    buildRoundIntervals(intervals, workoutFormat),
    mainExercises.length,
    split.main * 60
  );
  const cardioOptions = pickCardioOptions(input.focus, split.cardio * 60);
  const cardioIntervalSteps = buildCardioIntervalSteps(cardioOptions, split.cardio * 60);
  const cardioBlock = buildCardioBlock(split.cardio, cardioIntervalSteps);

  const mainBlock: WorkoutPlan['mainBlock'] = {
    rounds: intervals.rounds,
    workSeconds: roundIntervals[0]?.workSeconds ?? intervals.work,
    restSeconds: roundIntervals[0]?.restSeconds ?? intervals.rest,
    format: formatWorkoutFormat(workoutFormat),
    roundIntervals,
    exercises: mainExercises
  };
  const note = pickFinisher(input.energy, input.focus);
  const intervalSteps = includeIntervalSteps ? buildIntervalSteps(cardioIntervalSteps, mainBlock, note) : [];

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
