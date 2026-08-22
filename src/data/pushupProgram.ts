import { PushupBracketId, PushupProgressionState } from '@/types/build';

export type PushupSetTarget =
  | { type: 'fixed'; reps: number }
  | { type: 'minimum'; reps: number };

export interface PushupBracket {
  id: PushupBracketId;
  label: string;
  minReps: number;
  maxReps?: number;
}

interface PushupProgramDayData {
  day: number;
  restSeconds: number;
  columns: number[][];
}

interface PushupProgramWeekData {
  week: number;
  brackets: PushupBracket[];
  days: PushupProgramDayData[];
}

export interface PushupProgramPrescription {
  week: number;
  day: number;
  restSeconds: number;
  bracket: PushupBracket;
  sets: PushupSetTarget[];
}

const WEEKS_1_2: PushupBracket[] = [
  { id: 'under-5', label: '<5', minReps: 0, maxReps: 5 },
  { id: '6-10', label: '6–10', minReps: 6, maxReps: 10 },
  { id: '11-20', label: '11–20', minReps: 11, maxReps: 20 }
];

const WEEKS_3_4: PushupBracket[] = [
  { id: '16-20', label: '16–20', minReps: 16, maxReps: 20 },
  { id: '21-25', label: '21–25', minReps: 21, maxReps: 25 },
  { id: 'over-25', label: '>25', minReps: 26 }
];

const WEEK_5: PushupBracket[] = [
  { id: '31-35', label: '31–35', minReps: 31, maxReps: 35 },
  { id: '36-40', label: '36–40', minReps: 36, maxReps: 40 },
  { id: 'over-40', label: '>40', minReps: 41 }
];

const WEEK_6: PushupBracket[] = [
  { id: '46-50', label: '46–50', minReps: 46, maxReps: 50 },
  { id: '51-60', label: '51–60', minReps: 51, maxReps: 60 },
  { id: 'over-60', label: '>60', minReps: 61 }
];

// The final number in every column is stored as a semantic minimum (`N+`).
export const PUSHUP_PROGRAM: PushupProgramWeekData[] = [
  {
    week: 1,
    brackets: WEEKS_1_2,
    days: [
      { day: 1, restSeconds: 60, columns: [[2, 3, 2, 2, 3], [6, 6, 4, 4, 5], [10, 12, 7, 7, 9]] },
      { day: 2, restSeconds: 60, columns: [[3, 4, 2, 3, 4], [6, 8, 6, 6, 7], [10, 12, 8, 8, 12]] },
      { day: 3, restSeconds: 60, columns: [[4, 5, 4, 4, 5], [8, 10, 7, 7, 10], [11, 15, 9, 9, 13]] }
    ]
  },
  {
    week: 2,
    brackets: WEEKS_1_2,
    days: [
      { day: 1, restSeconds: 60, columns: [[4, 6, 4, 4, 6], [9, 11, 8, 8, 11], [14, 14, 10, 10, 15]] },
      { day: 2, restSeconds: 90, columns: [[5, 6, 4, 4, 7], [10, 12, 9, 9, 13], [14, 16, 12, 12, 17]] },
      { day: 3, restSeconds: 120, columns: [[5, 7, 5, 5, 8], [12, 13, 10, 10, 15], [16, 17, 14, 14, 20]] }
    ]
  },
  {
    week: 3,
    brackets: WEEKS_3_4,
    days: [
      { day: 1, restSeconds: 60, columns: [[10, 12, 7, 7, 9], [12, 17, 13, 13, 17], [14, 18, 14, 14, 20]] },
      { day: 2, restSeconds: 90, columns: [[10, 12, 8, 8, 12], [14, 19, 14, 14, 19], [20, 25, 15, 15, 25]] },
      { day: 3, restSeconds: 120, columns: [[11, 13, 9, 9, 13], [16, 21, 15, 15, 21], [22, 30, 20, 20, 28]] }
    ]
  },
  {
    week: 4,
    brackets: WEEKS_3_4,
    days: [
      { day: 1, restSeconds: 60, columns: [[12, 14, 11, 10, 16], [18, 22, 16, 16, 25], [21, 25, 21, 21, 32]] },
      { day: 2, restSeconds: 90, columns: [[14, 16, 12, 12, 18], [20, 25, 20, 20, 28], [25, 29, 25, 25, 36]] },
      { day: 3, restSeconds: 120, columns: [[16, 18, 13, 13, 20], [23, 28, 23, 23, 33], [29, 33, 29, 29, 40]] }
    ]
  },
  {
    week: 5,
    brackets: WEEK_5,
    days: [
      { day: 1, restSeconds: 60, columns: [[17, 19, 15, 15, 20], [28, 35, 25, 22, 35], [36, 40, 30, 24, 40]] },
      { day: 2, restSeconds: 45, columns: [[10, 10, 13, 13, 10, 10, 9, 25], [18, 18, 20, 20, 14, 14, 16, 40], [19, 19, 22, 22, 18, 18, 22, 45]] },
      { day: 3, restSeconds: 45, columns: [[13, 13, 15, 15, 12, 12, 10, 30], [18, 18, 20, 20, 17, 17, 20, 45], [20, 20, 24, 24, 20, 20, 22, 50]] }
    ]
  },
  {
    week: 6,
    brackets: WEEK_6,
    days: [
      { day: 1, restSeconds: 60, columns: [[25, 30, 20, 15, 40], [40, 50, 25, 25, 50], [45, 55, 35, 30, 55]] },
      { day: 2, restSeconds: 45, columns: [[14, 14, 15, 15, 14, 14, 10, 10, 44], [20, 20, 23, 23, 20, 20, 18, 18, 53], [22, 22, 30, 30, 24, 24, 18, 18, 58]] },
      { day: 3, restSeconds: 45, columns: [[13, 13, 17, 17, 16, 16, 14, 14, 50], [22, 22, 30, 30, 25, 25, 18, 18, 55], [26, 26, 33, 33, 26, 26, 22, 22, 60]] }
    ]
  }
];

export const PUSHUP_REASSESSMENT_WEEKS = [2, 4, 5, 6] as const;

export function getInitialPushupProgramWeek(assessedMax: number): 1 | 3 {
  return assessedMax > 20 ? 3 : 1;
}

export function getPushupWeek(week: number): PushupProgramWeekData {
  return PUSHUP_PROGRAM.find((item) => item.week === week) ?? PUSHUP_PROGRAM[0];
}

export function selectPushupBracket(week: number, assessedMax: number): PushupBracket {
  const brackets = getPushupWeek(week).brackets;
  return brackets.find((bracket) => assessedMax >= bracket.minReps && (bracket.maxReps === undefined || assessedMax <= bracket.maxReps))
    ?? (assessedMax < brackets[0].minReps ? brackets[0] : brackets[brackets.length - 1]);
}

export function getPushupProgramPrescription(
  state: Pick<PushupProgressionState, 'programWeek' | 'programDay' | 'baselineMax'>
): PushupProgramPrescription {
  const week = getPushupWeek(state.programWeek);
  const day = week.days.find((item) => item.day === state.programDay) ?? week.days[0];
  const bracket = selectPushupBracket(week.week, state.baselineMax);
  const bracketIndex = week.brackets.findIndex((item) => item.id === bracket.id);
  const reps = day.columns[bracketIndex];
  return {
    week: week.week,
    day: day.day,
    restSeconds: day.restSeconds,
    bracket,
    sets: reps.map((target, index) => ({
      type: index === reps.length - 1 ? 'minimum' : 'fixed',
      reps: target
    }))
  };
}

export function previousPushupProgramPosition(week: number, day: number): { week: number; day: number } {
  if (day > 1) return { week, day: day - 1 };
  if (week > 1) return { week: week - 1, day: 3 };
  return { week: 1, day: 1 };
}
