# FORGE required exercises and BUILD targets

Status: Proposed — future implementation.

## Problem

FORGE currently randomizes exercises within its attachment and focus pools. Push-ups and assisted pull-ups exist in the library, but neither is guaranteed to appear. Someone working on those capabilities should be able to keep them in every generated session while getting variety from the other exercises.

FORGE also uses timed intervals rather than BUILD's prescribed sets and actual-result logging. Simply adding a push-up or pull-up station does not provide the same training or progression as completing the user's BUILD targets.

## Intended experience

The user selects **Include push-ups**, **Include pull-ups**, or both. Those movements become required; FORGE randomizes the remaining exercises around them.

An optional **Use my BUILD targets** setting turns the selected movements into prescribed capability blocks using the user's saved BUILD state. For example, a session could contain the user's five push-up sets, three assisted pull-up sets, and a randomized lower-body/core block.

This supports two distinct choices:

| Choice | Required movements | Execution and progression |
| --- | --- | --- |
| Include exercises | Guaranteed stations in the FORGE workout | Existing FORGE interval flow; completion does not advance BUILD |
| Use my BUILD targets | Guaranteed prescribed sets for the selected BUILD capabilities | Record actual reps and assistance; advance only the completed capabilities |

The feature is opt-in. With no required movements selected, existing FORGE generation continues to work as it does today.

## Setup and preview

- Place the two inclusion controls beside FORGE's other generation constraints. Each can be selected independently.
- Show **Use my BUILD targets** when at least one required movement is selected. Explain that it uses prescribed sets and records results toward BUILD goals.
- Require an active BUILD profile with the selected capability enabled before using its targets. If it is unavailable, offer the ordinary FORGE version or a link to BUILD setup; do not silently switch modes.
- Required movements override the exercise pool's attachment/focus filtering. They do not override equipment availability. A legs-focused session can therefore contain required push-ups and randomized leg exercises.
- Ask for the equipment needed by the required movements when the current controls do not establish availability. Pull-ups need a bar, and the selected assistance setup must be available. Do not silently replace assisted pull-ups with strict unassisted pull-ups.
- In BUILD-target mode, use the saved movement variation, assistance, prescribed reps, final-set semantics, and rest preferences. Do not substitute knee push-ups for standard push-ups or change assistance to fit a random attachment choice.
- Label required exercises in the preview. In BUILD-target mode, show every target and rest interval before the user starts.
- Regenerating preserves the required selections and BUILD prescriptions while rerolling the other exercises. It never advances progression.
- Remember these selections for subsequent FORGE visits. Preference storage and whether it syncs across devices are implementation decisions.

## Workout generation

### Ordinary required exercises

Guarantee one station for each selected movement in the main exercise list. Preserve FORGE's normal round format and duration fitting. Choose the remaining stations from the existing pools without introducing duplicate push-up or pull-up variants.

### BUILD-target blocks

1. Resolve and snapshot the selected capability prescriptions using the same prescription functions as BUILD. This includes the current challenge table position or maintenance workout; FORGE must not create its own push-up formula.
2. Budget the warm-up, required sets, prescribed rests, and transitions first. Estimate rep-set duration explicitly rather than treating rep counts as seconds.
3. Allocate the remaining time to randomized accessories and/or conditioning. Prevent extra push-up or pull-up stations from duplicating required capability work.
4. Present required capability work as rep-based blocks, not repeated circuit stations. Do not multiply BUILD sets by FORGE's round count.
5. By default, place required capability work before randomized conditioning. When both are selected, use the same capability order as BUILD.

The selected time is a planning budget, not a deadline that cuts off an unfinished set. Actual duration can vary with rep speed, logging, and additional rest.

If required blocks cannot fit, show the estimated minimum and offer a longer duration, fewer required capabilities, or ordinary FORGE inclusion. Do not silently drop required sets, shorten prescribed rests, lower targets, or squeeze them into a rushed interval. A capability-only session is acceptable when the required blocks fit but no meaningful accessory block fits; explain this in the preview.

## Execution and logging

- Ordinary required-exercise mode uses the existing FORGE timer and completion behavior.
- BUILD-target mode supports rep-set completion alongside timed accessory intervals. Reuse BUILD's logging behavior where practical: actual reps, actual assistance, skipped sets, notes, rest controls, and correction of a completed set.
- Preserve the original targets separately from actual performance. A user who was prescribed 8/8/8 at 75 lb and logged 10/10/10 at 70 lb must retain both contexts.
- Assessments remain separate check-ins. Do not insert a max test into a FORGE session or block the session because a weekend check-in is pending.
- Freeze the prescription when a session starts. Before starting, if BUILD targets changed since generation, refresh the preview and let the user review the new targets.
- Finishing a hybrid session records one workout, including its required blocks and randomized content. Do not create a second synthetic BUILD workout for the same session.

## BUILD progression

- Use the shared pull-up and push-up progression functions for actually logged capability blocks. Do not implement a second progression engine inside FORGE.
- Advance each selected capability once from its own results, including normal handling of partial or skipped sets. A completely skipped capability does not earn successful progression.
- Update only the capabilities represented in the session. Do not rotate BUILD's weekly strength template or advance its planned accessories merely because a FORGE workout was completed.
- Retain the current push-up challenge rules: unfinished goals progress through the original table; completed goals can maintain demonstrated five-set volume; logged standard performance can establish capability.
- Invalidate or refresh the next unstarted BUILD prescription after capability progression. Keep an already-started session's targets intact.
- Ordinary FORGE inclusion does not establish BUILD progress because it does not record the same set-level evidence.
- Repeated completion taps, retries, cloud merges, and reopening a finished session must not apply capability progression twice.

If the saved profile changes during execution, preserve unrelated settings and capability state when saving. Define how conflicting simultaneous capability sessions are reconciled before release; do not overwrite the entire profile from an old workout snapshot.

## History, recalculation, and backup

Keep FORGE as the workout's source and identify whether it contains BUILD-target blocks. Extend the history model to carry structured prescribed-versus-actual capability results while retaining support for existing FORGE entries.

History should display required-set results, randomized exercise names, and capability progression summaries together. Progress views and **Recalculate BUILD** must recognize the structured capability results in these FORGE entries using the same evidence rules as BUILD history. Timed-only FORGE entries must not be interpreted as rep-set evidence.

Use one stable session identity across local persistence and cloud backup. Keep duplicate prevention and old-history migration compatible with the shared history limit and existing account ownership rules. Appending history, updating capability state, and clearing the active session must be recoverable after interruption without losing results or applying them twice.

## Acceptance criteria

1. Selecting both movements guarantees both in every generated workout; regenerating changes only the other exercises.
2. Required movements appear even when the random attachment pool would exclude them. Missing required equipment is explained before starting.
3. No required selections produces the existing FORGE behavior.
4. Ordinary inclusion remains a timed FORGE workout and does not advance BUILD.
5. A saved push-up prescription of 23 / 28 / 23 / 23 / 33+ appears unchanged in BUILD-target mode, including the final minimum and chosen rest settings.
6. Pull-up reps, assistance, and movement variation match the saved BUILD prescription. Different actual reps or assistance remain separately recorded.
7. Required sets appear once, not once per randomized circuit round.
8. An insufficient time budget produces actionable alternatives without changing or dropping required targets.
9. Completing only pull-ups updates pull-up progression and the next unstarted BUILD workout; push-up state, BUILD template rotation, and planned accessory progression remain unchanged.
10. Completing both blocks uses their actual results to update both capabilities. Partial and skipped sets follow the same rules as BUILD.
11. One hybrid completion creates one history entry. Retrying completion or syncing the same entry does not advance capabilities again.
12. Progress and recalculation recognize structured FORGE capability results; legacy or timed-only FORGE history remains readable and does not affect BUILD targets.
13. A pending weekend check-in does not prevent required training blocks from appearing.
14. Changed targets before starting require a refreshed preview; changed settings during execution do not overwrite unrelated profile data when results save.

## Implementation areas

- `app/forge.tsx`: required-exercise controls, target-mode selection, equipment handling, and preview.
- `src/lib/generateWorkout.ts`: required exercise selection and time budgeting.
- `src/types/workout.ts` and `src/types/build.ts`: hybrid plan and history representations.
- `app/workout.tsx` / shared workout UI: rep-based capability blocks alongside timed intervals.
- Shared prescription and progression modules: keep one source of capability rules.
- Storage, cloud sync, progress, history, and recalculation: structured results and idempotent completion.

## Out of scope

Arbitrary exercise pinning, changing the challenge tables, automatic equipment substitutions, new goal types, and treating timed circuit performance as a substitute for logged BUILD sets.

## Decisions to resolve during implementation

- Persist inclusion preferences locally or with the cloud profile.
- Define rep-speed estimates and transition allowances for duration planning.
- Decide how to present a capability-only result when the time budget leaves no accessory block.
- Choose the hybrid plan/history schema and migration version.
- Define conflict handling for concurrent capability sessions across devices and app installations.
