# Fitness Forge

**BUILD your capabilities. FORGE your fitness.**

Fitness Forge is a local-first Expo app for deliberate physical progress and varied daily training.

## BUILD + FORGE

BUILD answers “What should I do today to slowly get better?” It provides a Monday/Wednesday/Friday strength plan, records prescribed and actual sets separately, and advances capability goals conservatively.

The first two capabilities are:

- First strict pull-up: build assisted volume, confirm the top rep target twice, reduce assistance, recalibrate, then accumulate unassisted reps.
- 50 consecutive strict push-ups: build submaximal five-set volume at wall, incline, knee, or standard push-ups; assess periodically; and recalibrate after graduating to a harder variation.

FORGE answers “Give me a good workout today.” It preserves the existing randomized generator, including time, focus, energy, attachment selection, cardio/plyometric work, interval timing, spoken transitions, and optional finishers.

Both sources write to one workout history while retaining source-specific context. BUILD records variation, assistance/load, program position, and planned-versus-actual performance. FORGE records its generated session summary.

## Architecture

- `src/types/build.ts` — BUILD profiles, prescriptions, results, assessments, milestones, and unified history types
- `src/data/buildProgram.ts` — editable Strength A/B/C templates and prescription construction
- `src/data/equipment.ts` — small reusable equipment catalog with available loads
- `src/lib/pullupProgression.ts` — pure assisted and unassisted pull-up progression
- `src/lib/pushupProgression.ts` — pure push-up programming, assessment, and variation graduation
- `src/lib/buildProgression.ts` — applies completed workout results to the saved profile
- `src/storage/appStorage.ts` — versioned AsyncStorage keys for BUILD state, the active prescription, and unified history
- `src/lib/generateWorkout.ts` — existing FORGE generation logic
- `app/` — Expo Router screens for Today, Build, Forge, Progress, History, and the two source-specific players

Progression rules do not live in React components. Screens render typed prescriptions and submit typed results; pure functions determine the next state. BUILD and FORGE share exercises, equipment concepts, source labeling, and history, while keeping players suited to their different execution styles.

## Progression ladders

A ladder combines movement difficulty with capacity at that movement. Pull-ups change assistance and rep capacity. Push-ups move through `wall → incline → knee → standard`, with a new assessment and baseline after every graduation. Easier-level volume is never copied directly to the harder level.

The algorithms favor repeatable training:

- One missed set repeats the target.
- Several missed sets reduce only one step.
- Skipped workouts do not advance or punish the program.
- Long breaks do not cause automatic regression.
- Manual load or assistance changes are stored as actual performance and cause conservative recalibration.
- Push-up assessments occur after six successful program sessions, not every workout.

## Adding another capability

1. Add the focused state and prescription/result fields to `src/types/build.ts`.
2. Implement a pure strategy beside the pull-up and push-up modules.
3. Add its prescription data to `src/data/buildProgram.ts`.
4. Apply its result in `src/lib/buildProgression.ts`.
5. Add edge-case tests before adding capability-specific UI.

Prefer a small, excellent capability implementation over a generic fitness framework.

## Run locally

Requires Node 20.19.4 or newer and pnpm 10.8.1.

```bash
pnpm install
pnpm start
```

Open the app with Expo Go, an iOS/Android development build, or the web target.

Useful checks:

```bash
pnpm typecheck
pnpm test
pnpm check:expo
pnpm build:web
```

## Current scope

Data is local to the device; there are no accounts or cloud sync. BUILD readiness adjustments, exercise substitution, program-template editing, and running/soccer tracking are future extensions. The app is training software, not medical advice; stop a set when form changes or pain occurs.
