import { Exercise } from '@/types/workout';

export const EXERCISES: Exercise[] = [
  {
    id: 'rope-back-burner',
    name: 'Back Burner Pull',
    attachment: 'rope',
    tags: ['pull', 'posterior', 'athletic'],
    focus: ['full body', 'core + back', 'endurance'],
    cue: 'Hinge slightly and pull elbows to ribs with control.'
  },
  {
    id: 'strap-reverse-lunge',
    name: 'Alternating Reverse Lunge',
    attachment: 'strap',
    tags: ['legs', 'athletic'],
    focus: ['full body', 'legs + power', 'core + back'],
    cue: 'Step back long, front heel loaded, torso tall.'
  },
  {
    id: 'bar-straight-arm-pulldown',
    name: 'Hinged Straight-Arm Pulldown',
    attachment: 'bar',
    tags: ['pull', 'posterior', 'core'],
    focus: ['core + back', 'endurance', 'recovery'],
    cue: 'Keep ribs down while driving bar to pockets.'
  },
  {
    id: 'handles-resisted-march',
    name: 'Resisted March',
    attachment: 'handles',
    tags: ['core', 'athletic', 'recovery'],
    focus: ['core + back', 'recovery', 'full body'],
    cue: 'Brace and march slowly; avoid side-to-side sway.'
  },
  {
    id: 'rope-skater-row',
    name: 'Skater Row',
    attachment: 'rope',
    tags: ['pull', 'legs', 'athletic'],
    focus: ['sprint', 'legs + power', 'full body'],
    cue: 'Push off outside leg and row explosively.'
  },
  {
    id: 'strap-split-squat',
    name: 'Assisted Split Squat',
    attachment: 'strap',
    tags: ['legs', 'core'],
    focus: ['legs + power', 'recovery', 'full body'],
    cue: 'Use strap lightly, keep front knee tracking over toes.'
  },
  {
    id: 'bar-rotational-press',
    name: 'Rotational Press-Out',
    attachment: 'bar',
    tags: ['core', 'athletic'],
    focus: ['core + back', 'sprint', 'full body'],
    cue: 'Rotate from hips; finish with full arm extension.'
  },
  {
    id: 'handles-hamstring-curl',
    name: 'Standing Hamstring Curl',
    attachment: 'handles',
    tags: ['posterior', 'legs', 'recovery'],
    focus: ['recovery', 'legs + power', 'endurance'],
    cue: 'Stay tall and avoid arching low back.'
  }
];

export const CARDIO_LIBRARY: Record<string, string[]> = {
  'full body': ['45s jump rope + 15s walk x5', '10 lateral shuffles + 4 sprawls x5'],
  sprint: ['20s fast high-knees + 40s walk x6', '10m acceleration repeats x8'],
  endurance: ['60s easy run + 30s brisk shuffle x5', '90s cyclical hops x4'],
  'core + back': ['30s ladder + 30s shuffle x5', '20s pogo + 40s fast walk x6'],
  'legs + power': ['8 broad jumps + quick reset x5', '20s split-switch + 40s walk x6'],
  recovery: ['Nasal-breath incline walk x6 min', 'Low pogo + mobility flow x6 min']
};
