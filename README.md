# Fitness Forge

**BUILD your capabilities. FORGE your fitness.**

Fitness Forge is a local-first Expo app for deliberate physical progress and varied daily training. Optional Supabase accounts add private cloud backup without making a network connection necessary to complete a workout.

## BUILD + FORGE

BUILD answers “What should I do today to slowly get better?” It provides a Monday/Wednesday/Friday strength plan, records prescribed and actual sets separately, and advances capability goals conservatively.

The first two capabilities are:

- First strict pull-up: build assisted volume, confirm the top rep target twice, reduce assistance, recalibrate, then accumulate unassisted reps.
- 50 consecutive strict push-ups: follow a table-driven six-week program at wall, incline, knee, or standard push-ups; reassess between phases; and recalibrate after graduating to a harder variation.

FORGE answers “Give me a good workout today.” It preserves the existing randomized generator, including time, focus, energy, attachment selection, cardio/plyometric work, interval timing, spoken transitions, and optional finishers.

Both sources write to one workout history while retaining source-specific context. BUILD records variation, assistance/load, program position, and planned-versus-actual performance. FORGE records its generated session summary.

BUILD prescriptions also include configurable recovery guidance. Dense defaults use 60 seconds for pull-ups, push-ups, and strength accessories, plus 45 seconds for conditioning and core. BUILD settings offer short presets, and push-ups can optionally return to the original table’s 45–120-second rest. Completing a non-final set starts a countdown that can be paused, extended, or skipped; longer rest is always allowed.

## Architecture

- `src/types/build.ts` — BUILD profiles, prescriptions, results, assessments, milestones, and unified history types
- `src/data/buildProgram.ts` — editable Strength A/B/C templates and prescription construction
- `src/data/pushupProgram.ts` — exact six-week push-up tables, rep brackets, semantic minimum sets, and rest intervals
- `src/data/equipment.ts` — small reusable equipment catalog with available loads
- `src/lib/pullupProgression.ts` — pure assisted and unassisted pull-up progression
- `src/lib/pushupProgression.ts` — pure push-up programming, assessment, and variation graduation
- `src/lib/buildProgression.ts` — applies completed workout results to the saved profile
- `src/storage/appStorage.ts` — versioned AsyncStorage keys for BUILD state, the active prescription, and unified history
- `src/storage/cloudSync.ts` — local-first Supabase synchronization and safe account adoption
- `src/auth/AuthProvider.tsx` — persistent Supabase sessions, background backup, and sync status
- `supabase/migrations/` — cloud tables, constraints, grants, and per-user Row Level Security policies
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
- Push-up assessments occur after Weeks 2, 4, 5, and 6. The result selects the next phase bracket; an insufficient result repeats the prior week without punishment.

The push-up table contains 18 sessions. Weeks 1–4 prescribe five sets, Weeks 5–6 include selected eight- and nine-set days, and every final set is an `N+` minimum rather than a fixed stopping point. Program week/day/bracket and movement variation are stored independently, so graduating to a harder variation always starts with a new assessment and bracket recalibration. Assessments of 20 reps or fewer enter Week 1; higher starting assessments enter Week 3. Weeks 5 and 6 remain reassessment-gated.

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

## Optional Supabase backup

The app works without Supabase. When configured, every workout still saves to AsyncStorage first and then syncs in the background. Failed uploads never discard the device copy.

1. Create or choose a Supabase project.
2. Apply `supabase/migrations/20260823000000_create_fitness_forge_cloud_backup.sql` with the Supabase SQL Editor, or link the Supabase CLI and run `supabase db push`.
3. Copy `.env.example` to `.env` and add the project URL and publishable key from the Supabase Connect panel.
4. Restart Expo with `pnpm exec expo start --clear`.
5. Open Settings, create an account or sign in, and use **Back Up Now** to verify the connection.

Email/password authentication is the initial login method. Supabase projects commonly require new users to confirm their email; that behavior is controlled in the project’s Auth settings.

The publishable key is intentionally available to the Expo client. Never add a secret or service-role key to the app. Cloud access is protected by grants and Row Level Security policies requiring `auth.uid() = user_id` on both Fitness Forge tables.

Cloud storage uses two prefixed tables:

- `fitness_forge_user_data` stores one versioned BUILD/profile snapshot and active workouts per user.
- `fitness_forge_workout_sessions` stores idempotent BUILD and FORGE history rows keyed by user and stable workout ID.

On the first sign-in to an empty cloud account, existing anonymous device data is uploaded. If the account already has cloud state, that state wins on a device that has never linked it. Workout histories are merged by stable ID. To prevent cross-account leakage or local data loss, cloud sync refuses to relink an installation already owned by a different user; multi-account device switching is not part of this first version. Completed sessions merge safely across devices, while simultaneous offline edits to the BUILD profile currently use last-successful-sync behavior rather than field-level conflict resolution.

Useful checks:

```bash
pnpm typecheck
pnpm test
pnpm check:expo
pnpm build:web
```

## Current scope

Anonymous data remains local to the device. Supabase backup is optional and currently supports email/password accounts; password reset, social login, account deletion, and advanced multi-device conflict resolution remain future work. BUILD readiness adjustments, exercise substitution, program-template editing, and running/soccer tracking are also future extensions. The app is training software, not medical advice; stop a set when form changes or pain occurs.
