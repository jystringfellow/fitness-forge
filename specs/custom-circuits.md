# Custom FORGE circuits with BUILD targets

Status: Implemented in the app.

FORGE supports any number of fixed stations selected from the exercise library, plus a random bodyweight core station. Each ordinary station can use a timed interval or rep count and can appear every round or a selected number of times. Circuits can have three, four, or five rounds. Every round has the same number of stations: FORGE replaces the positions left open by fixed exercises that appear only in some rounds, then adds optional randomized stations. Time and energy shape that filler and rest but do not change the fixed station durations or counts. If the fixed work and replacement stations cannot fit, generation reports the minimum time required.

BUILD pull-ups and push-ups can be linked as fixed stations. Their saved prescription determines the number of sets, target reps, assistance, and variation. Sets are distributed across the circuit rounds. Circuit rest replaces BUILD's between-set rest for these stations. A linked station can be rep paced or have a 20–30 second work window. After timed work, circuit rest starts immediately and the user logs actual reps and assistance during that countdown. If rest reaches zero before logging, the player waits for a result or an explicit skip. Timed-only ordinary stations do not advance BUILD.

Completing a hybrid circuit creates one FORGE history entry with structured BUILD results. Only linked capabilities with recorded sets advance; the weekly BUILD template and unrelated capability stay unchanged. Stable workout IDs and applied-session IDs prevent replaying progression. The active workout stores set logs and position for recovery and cloud backup. History, Progress, and Recalculate BUILD read hybrid results.

Fixed station choices are saved locally. An active BUILD profile and the needed equipment are required for linked targets. The workout preview shows rounds, linked prescriptions, an estimated duration, and BUILD equipment. Changed BUILD targets refresh the preview before starting.

Future refinements: named circuit templates, equipment inventory checks, session conflict handling across devices, and a more flexible station order editor.
