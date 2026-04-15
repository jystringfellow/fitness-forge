import { Exercise } from '@/types/workout';

export const EXERCISES: Exercise[] = [
  // =========================
  // D HANDLES
  // =========================
  {
    id: 'handles-single-arm-row',
    name: 'Single-Arm Row',
    attachment: 'handles',
    tags: ['pull', 'core', 'posterior'],
    focus: ['core + back', 'full body', 'endurance'],
    cue: 'Stay tall, resist torso twist, and pull elbow toward back pocket.'
  },
  {
    id: 'handles-standing-chest-press',
    name: 'Standing Chest Press',
    attachment: 'handles',
    tags: ['push', 'core', 'athletic'],
    focus: ['full body', 'core + back', 'endurance'],
    cue: 'Use a split stance, keep ribs down, and press without leaning.'
  },
  {
    id: 'handles-pallof-press',
    name: 'Pallof Press',
    attachment: 'handles',
    tags: ['core', 'anti-rotation', 'recovery'],
    focus: ['core + back', 'recovery', 'full body'],
    cue: 'Brace hard and press straight out without letting your torso rotate.'
  },
  {
    id: 'handles-reverse-lunge',
    name: 'Reverse Lunge',
    attachment: 'handles',
    tags: ['legs', 'core', 'athletic'],
    focus: ['legs + power', 'full body', 'core + back'],
    cue: 'Step back long, stay tall, and drive through the front foot.'
  },
  {
    id: 'handles-single-arm-deadlift',
    name: 'Single-Arm Deadlift',
    attachment: 'handles',
    tags: ['posterior', 'legs', 'core'],
    focus: ['legs + power', 'core + back', 'full body'],
    cue: 'Hinge through the hips and stay square through the shoulders.'
  },
  {
    id: 'handles-rotational-punch',
    name: 'Rotational Punch',
    attachment: 'handles',
    tags: ['athletic', 'core', 'power'],
    focus: ['sprint', 'full body', 'endurance'],
    cue: 'Rotate from hips and trunk, then snap the hand forward with control.'
  },
  {
    id: 'handles-face-pull',
    name: 'Face Pull',
    attachment: 'handles',
    tags: ['pull', 'posture', 'recovery'],
    focus: ['core + back', 'recovery', 'full body'],
    cue: 'Pull toward face with elbows high and shoulder blades moving smoothly.'
  },
  {
    id: 'handles-split-squat',
    name: 'Split Squat',
    attachment: 'handles',
    tags: ['legs', 'balance', 'athletic'],
    focus: ['legs + power', 'full body', 'recovery'],
    cue: 'Drop straight down, stay tall, and keep pressure through the front foot.'
  },

  // =========================
  // ROPE
  // =========================
  {
    id: 'rope-back-burner',
    name: 'Back Burner',
    attachment: 'rope',
    tags: ['pull', 'core', 'athletic'],
    focus: ['core + back', 'full body', 'endurance'],
    cue: 'Perform right arm row, left arm row, then both arms while staying square.'
  },
  {
    id: 'rope-face-pull',
    name: 'Rope Face Pull',
    attachment: 'rope',
    tags: ['pull', 'posture', 'recovery'],
    focus: ['core + back', 'recovery', 'full body'],
    cue: 'Pull rope toward nose or eyes and finish with elbows wide.'
  },
  {
    id: 'rope-squat-pull',
    name: 'Squat + Pull',
    attachment: 'rope',
    tags: ['legs', 'pull', 'full body'],
    focus: ['full body', 'endurance', 'legs + power'],
    cue: 'Sit into the squat, then stand tall as you pull the rope to ribs.'
  },
  {
    id: 'rope-curl-to-press',
    name: 'Curl to Press',
    attachment: 'rope',
    tags: ['push', 'pull', 'athletic'],
    focus: ['full body', 'endurance', 'recovery'],
    cue: 'Move smoothly from curl to overhead press without arching back.'
  },
  {
    id: 'rope-overhead-press',
    name: 'Overhead Press',
    attachment: 'rope',
    tags: ['push', 'core', 'posture'],
    focus: ['full body', 'core + back', 'recovery'],
    cue: 'Brace through midline and press up without shrugging excessively.'
  },
  {
    id: 'rope-anti-rotation-hold',
    name: 'Anti-Rotation Hold',
    attachment: 'rope',
    tags: ['core', 'anti-rotation', 'recovery'],
    focus: ['core + back', 'recovery', 'full body'],
    cue: 'Hold rope at chest height and resist being turned toward the machine.'
  },
  {
    id: 'rope-high-pull',
    name: 'High Pull',
    attachment: 'rope',
    tags: ['power', 'posterior', 'athletic'],
    focus: ['sprint', 'legs + power', 'full body'],
    cue: 'Drive through feet and hips, then guide elbows high with control.'
  },

  // =========================
  // STRAIGHT BAR
  // =========================
  {
    id: 'straight-bar-rdl',
    name: 'Romanian Deadlift',
    attachment: 'straight-bar',
    tags: ['posterior', 'legs', 'power'],
    focus: ['legs + power', 'sprint', 'full body'],
    cue: 'Push hips back, keep spine long, and feel the stretch in hamstrings.'
  },
  {
    id: 'straight-bar-front-squat',
    name: 'Front Squat',
    attachment: 'straight-bar',
    tags: ['legs', 'core', 'athletic'],
    focus: ['legs + power', 'full body', 'endurance'],
    cue: 'Stay upright, brace hard, and drive evenly through both feet.'
  },
  {
    id: 'straight-bar-row',
    name: 'Standing Row',
    attachment: 'straight-bar',
    tags: ['pull', 'core', 'posterior'],
    focus: ['core + back', 'full body', 'endurance'],
    cue: 'Pull bar toward lower ribs and keep shoulders down away from ears.'
  },
  {
    id: 'straight-bar-pull-through',
    name: 'Pull-Through',
    attachment: 'straight-bar',
    tags: ['posterior', 'legs', 'athletic'],
    focus: ['legs + power', 'sprint', 'full body'],
    cue: 'Let hips travel back, then snap them through without leaning backward.'
  },
  {
    id: 'straight-bar-good-morning',
    name: 'Good Morning',
    attachment: 'straight-bar',
    tags: ['posterior', 'core', 'recovery'],
    focus: ['core + back', 'legs + power', 'recovery'],
    cue: 'Hinge with soft knees and keep your trunk braced throughout.'
  },
  {
    id: 'straight-bar-anti-rotation-march',
    name: 'Anti-Rotation March',
    attachment: 'straight-bar',
    tags: ['core', 'athletic', 'anti-rotation'],
    focus: ['core + back', 'sprint', 'full body'],
    cue: 'Hold steady tension and slowly march without letting hips sway.'
  },
  {
    id: 'straight-bar-straight-arm-pulldown',
    name: 'Hinged Straight-Arm Pulldown',
    attachment: 'straight-bar',
    tags: ['pull', 'posterior', 'core'],
    focus: ['core + back', 'endurance', 'recovery'],
    cue: 'Keep ribs down while driving the bar toward pockets.'
  },

  // =========================
  // CURL BAR
  // =========================
  {
    id: 'curl-bar-rdl',
    name: 'Curl Bar Romanian Deadlift',
    attachment: 'curl-bar',
    tags: ['posterior', 'legs', 'power'],
    focus: ['legs + power', 'sprint', 'full body'],
    cue: 'Use the comfortable angled grip and hinge through the hips.'
  },
  {
    id: 'curl-bar-row',
    name: 'Curl Bar Row',
    attachment: 'curl-bar',
    tags: ['pull', 'core', 'posterior'],
    focus: ['core + back', 'full body', 'endurance'],
    cue: 'Pull smoothly and keep wrists relaxed with the angled grip.'
  },
  {
    id: 'curl-bar-front-squat',
    name: 'Curl Bar Front Squat',
    attachment: 'curl-bar',
    tags: ['legs', 'core', 'athletic'],
    focus: ['legs + power', 'full body', 'endurance'],
    cue: 'Stay tall through the torso and keep elbows comfortably set.'
  },
  {
    id: 'curl-bar-high-pull',
    name: 'Curl Bar High Pull',
    attachment: 'curl-bar',
    tags: ['power', 'athletic', 'posterior'],
    focus: ['sprint', 'legs + power', 'full body'],
    cue: 'Drive from the hips first, then let elbows rise high and outside.'
  },
  {
    id: 'curl-bar-good-morning',
    name: 'Curl Bar Good Morning',
    attachment: 'curl-bar',
    tags: ['posterior', 'core', 'recovery'],
    focus: ['core + back', 'legs + power', 'recovery'],
    cue: 'Hinge slowly and keep your trunk stacked over your hips.'
  },
  {
    id: 'curl-bar-row-clean-flow',
    name: 'Row to Clean Flow',
    attachment: 'curl-bar',
    tags: ['athletic', 'pull', 'full body'],
    focus: ['full body', 'sprint', 'endurance'],
    cue: 'Row first, then rise tall into a smooth clean-like finish.'
  },

  // =========================
  // ANKLE CUFFS
  // =========================
  {
    id: 'ankle-cuffs-hip-flexion-drive',
    name: 'Hip Flexion Drive',
    attachment: 'ankle-cuffs',
    tags: ['legs', 'athletic', 'sprint'],
    focus: ['sprint', 'legs + power', 'full body'],
    cue: 'Drive knee up quickly with a tall torso and controlled return.'
  },
  {
    id: 'ankle-cuffs-hamstring-curl',
    name: 'Standing Hamstring Curl',
    attachment: 'ankle-cuffs',
    tags: ['posterior', 'legs', 'recovery'],
    focus: ['recovery', 'legs + power', 'endurance'],
    cue: 'Stay tall and avoid arching low back as heel comes toward glute.'
  },
  {
    id: 'ankle-cuffs-lateral-leg-raise',
    name: 'Lateral Leg Raise',
    attachment: 'ankle-cuffs',
    tags: ['legs', 'stability', 'recovery'],
    focus: ['recovery', 'legs + power', 'full body'],
    cue: 'Lift from the hip, keep toes forward, and avoid leaning away.'
  },
  {
    id: 'ankle-cuffs-reverse-lunge',
    name: 'Reverse Lunge',
    attachment: 'ankle-cuffs',
    tags: ['legs', 'core', 'athletic'],
    focus: ['legs + power', 'full body', 'core + back'],
    cue: 'Control the step back and keep front leg stable as you rise.'
  },
  {
    id: 'ankle-cuffs-march-hold',
    name: 'March Hold',
    attachment: 'ankle-cuffs',
    tags: ['core', 'athletic', 'sprint'],
    focus: ['sprint', 'core + back', 'recovery'],
    cue: 'Pause at the top of each knee drive without losing posture.'
  },
  {
    id: 'ankle-cuffs-crossover-step-out',
    name: 'Crossover Step-Out',
    attachment: 'ankle-cuffs',
    tags: ['legs', 'athletic', 'stability'],
    focus: ['sprint', 'legs + power', 'full body'],
    cue: 'Move across the body with control and resist being pulled off-line.'
  },

  // =========================
  // STRAP / BELT
  // =========================
  {
    id: 'strap-assisted-chin-up',
    name: 'Assisted Chin-Up',
    attachment: 'strap',
    tags: ['pull', 'posterior', 'athletic'],
    focus: ['core + back', 'full body', 'recovery'],
    cue: 'Use just enough assistance to move smoothly through full range.'
  },
  {
    id: 'strap-assisted-pull-up',
    name: 'Assisted Pull-Up',
    attachment: 'strap',
    tags: ['pull', 'posterior', 'athletic'],
    focus: ['core + back', 'full body', 'recovery'],
    cue: 'Drive elbows down and keep body long as you pull.'
  },
  {
    id: 'strap-standing-chest-press',
    name: 'Standing Chest Press',
    attachment: 'strap',
    tags: ['push', 'core', 'athletic'],
    focus: ['full body', 'core + back', 'endurance'],
    cue: 'Press forward from a tall stance and avoid flaring ribs.'
  },
  {
    id: 'strap-standing-hip-thrust',
    name: 'Standing Hip Thrust',
    attachment: 'strap',
    tags: ['posterior', 'legs', 'athletic'],
    focus: ['legs + power', 'sprint', 'full body'],
    cue: 'Drive hips through hard and finish tall without overextending back.'
  },
  {
    id: 'strap-alt-reverse-lunge',
    name: 'Alternating Reverse Lunge',
    attachment: 'strap',
    tags: ['legs', 'athletic', 'core'],
    focus: ['full body', 'legs + power', 'core + back'],
    cue: 'Step back long, front heel loaded, torso tall.'
  },
  {
    id: 'strap-straight-arm-pulldown',
    name: 'Hinged Straight-Arm Pulldown',
    attachment: 'strap',
    tags: ['pull', 'posterior', 'core'],
    focus: ['core + back', 'endurance', 'recovery'],
    cue: 'Hinge slightly and drive arms toward hips without shrugging.'
  },
  {
    id: 'strap-back-burner',
    name: 'Back Burner',
    attachment: 'strap',
    tags: ['pull', 'core', 'athletic'],
    focus: ['core + back', 'full body', 'endurance'],
    cue: 'Perform right arm row, left arm row, then both arms while staying square.'
  },
  {
    id: 'strap-resisted-march',
    name: 'Resisted March',
    attachment: 'strap',
    tags: ['core', 'athletic', 'sprint'],
    focus: ['sprint', 'core + back', 'full body'],
    cue: 'Brace through trunk and drive knees up without side-to-side sway.'
  },
  {
    id: 'strap-lateral-shuffle',
    name: 'Lateral Shuffle',
    attachment: 'strap',
    tags: ['athletic', 'legs', 'conditioning'],
    focus: ['sprint', 'endurance', 'full body'],
    cue: 'Stay low, move quickly, and keep tension through the strap.'
  },
  {
    id: 'strap-squat',
    name: 'Weighted Squat',
    attachment: 'strap',
    tags: ['legs', 'core', 'athletic'],
    focus: ['legs + power', 'full body', 'endurance'],
    cue: 'Sit down between hips and stand up strong through mid-foot.'
  },

  // =========================
  // OPTIONAL NON-CABLE TOOLS
  // Helps if you want app variety later
  // =========================
  {
    id: 'kettlebell-swing',
    name: 'Kettlebell Swing',
    attachment: 'kettlebell',
    tags: ['posterior', 'power', 'conditioning'],
    focus: ['sprint', 'endurance', 'legs + power'],
    cue: 'Snap hips through and let the bell float; do not lift with arms.'
  },
  {
    id: 'kettlebell-goblet-squat',
    name: 'Goblet Squat',
    attachment: 'kettlebell',
    tags: ['legs', 'core', 'full body'],
    focus: ['legs + power', 'full body', 'recovery'],
    cue: 'Stay tall through chest and sink into a comfortable deep squat.'
  },
  {
    id: 'dumbbell-single-leg-rdl',
    name: 'Single-Leg Romanian Deadlift',
    attachment: 'dumbbells',
    tags: ['posterior', 'balance', 'legs'],
    focus: ['legs + power', 'core + back', 'recovery'],
    cue: 'Reach hips back and stay long from head to heel.'
  }
];

export const CARDIO_LIBRARY: Record<string, string[]> = {
  'full body': [
    '45s jump rope + 15s easy bounce x 5',
    '20s ladder quick feet + 20s lateral shuffle + 20s walk x 5',
    '30s jog in place + 30s skater steps x 5'
  ],
  sprint: [
    '20s fast high-knees + 40s walk x 6',
    '20s pogo hops + 20s fast feet + 20s walk x 5',
    '15s ladder sprint pattern + 15s lateral shuffle + 30s reset x 6',
    '10s hard acceleration in place + 20s easy march x 8'
  ],
  endurance: [
    '60s easy jog + 30s brisk shuffle x 5',
    '40s jump rope + 20s easy bounce x 6',
    '30s fast feet + 30s walk x 8',
    '45s low-impact lateral steps + 15s nasal-breath recovery x 6'
  ],
  'core + back': [
    '30s ladder + 30s lateral shuffle x 5',
    '20s pogo hops + 40s fast walk x 6',
    '30s jump rope + 30s tall march x 5'
  ],
  'legs + power': [
    '5 box jumps + 20s walk x 5',
    '20s pogo hops + 20s squat jumps + 20s reset x 4',
    '8 skater hops/side + quick reset x 5',
    '15s split-switch hops + 45s walk x 6'
  ],
  recovery: [
    '6 min nasal-breath march and shuffle flow',
    '20s low pogo + 40s mobility reset x 6',
    '5 min easy jump rope or ghost rope',
    '30s tall march + 30s side step x 5'
  ]
};