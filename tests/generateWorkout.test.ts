import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTargetsMatchPlan, formatBuildTargetSummary, formatCircuitRoundPreview, generateWorkout } from '@/lib/generateWorkout';
import { createInitialBuildProfile } from '@/data/buildProgram';
import {
  ATTACHMENT_OPTIONS,
  ENERGY_OPTIONS,
  FOCUS_OPTIONS,
  TIME_OPTIONS
} from '@/types/workout';

test('generated workouts honor the selected duration', () => {
  for (const time of TIME_OPTIONS) {
    for (const energy of ENERGY_OPTIONS) {
      for (const focus of FOCUS_OPTIONS) {
        for (const attachment of ATTACHMENT_OPTIONS) {
          for (let sample = 0; sample < 3; sample += 1) {
            const plan = generateWorkout({ time, energy, focus, attachment }, true);
            const scheduledDurationSecs = plan.intervalSteps
              .filter((step) => step.section !== 'finisher')
              .reduce((sum, step) => sum + step.durationSecs, 0);
            const expectedDurationSecs = time * 60;

            assert.ok(
              Math.abs(scheduledDurationSecs - expectedDurationSecs) <= 2,
              `${time} min / ${energy} / ${focus} / ${attachment} generated ${scheduledDurationSecs}s`
            );
            assert.ok(plan.intervalSteps.some((step) => step.section === 'cardio'));
            assert.ok(plan.intervalSteps.some((step) => step.section === 'main' && !step.isPrompt));
            assert.ok(plan.intervalSteps.filter((step) => step.section === 'main' && step.isRest && !step.isPrompt)
              .every((step) => step.text.startsWith('Rest for ')));
            assert.notEqual(plan.input.attachment, 'recommended');
          }
        }
      }
    }
  }
});

test('workout exercises are unique within a generated main block', () => {
  for (let sample = 0; sample < 100; sample += 1) {
    const plan = generateWorkout(
      {
        time: 20,
        energy: 'normal',
        focus: 'full body',
        attachment: 'recommended'
      },
      true
    );
    const exerciseIds = plan.mainBlock.exercises.map((exercise) => exercise.id);

    assert.equal(new Set(exerciseIds).size, exerciseIds.length);
  }
});

test('custom circuit preserves fixed stations and spaces BUILD pull-up sets across five rounds', () => {
  const profile = createInitialBuildProfile({
    pullupEnabled: true, pullupAssistanceLb: 40, pullupCurrentReps: 6, assistanceIncrementLb: 5,
    pushupEnabled: false, pushupVariation: 'standard', pushupCurrentMax: 10
  });
  const plan = generateWorkout({
    time: 20, energy: 'low', focus: 'legs + power', attachment: 'dumbbells', circuitRounds: 5,
    fixedStations: [
      { id: 'push', exerciseId: 'bodyweight-standard-push-up', mode: 'time', seconds: 25, frequency: 'every-round' },
      { id: 'abs', exerciseId: 'random-core', mode: 'time', seconds: 30, frequency: 'every-round' },
      { id: 'pull', exerciseId: 'build-pull-up', mode: 'build', seconds: 25, frequency: 'every-round' }
    ]
  }, true, profile);
  const main = plan.intervalSteps.filter((step) => step.section === 'main' && !step.isRest);
  assert.equal(main.filter((step) => step.exerciseName === 'Standard Push-Up').length, 5);
  assert.ok(main.filter((step) => step.exerciseName === 'Standard Push-Up').every((step) => step.durationSecs === 25));
  assert.equal(main.filter((step) => step.isLinkedWork).length, 3);
  assert.deepEqual(main.filter((step) => step.isLinkedWork).map((step) => step.round), [1, 3, 5]);
  for (const [index, step] of plan.intervalSteps.entries()) {
    if (!step.isLinkedWork) continue;
    const rest = plan.intervalSteps[index + 1];
    assert.equal(rest.isRest, true);
    assert.equal(rest.durationSecs, 25);
    assert.match(rest.text, /^Rest for 25s/);
    assert.equal(rest.linkedSet?.exerciseId, plan.linkedExercises?.[0].id);
  }
  assert.equal(plan.linkedExercises?.[0].restSecondsBetweenSets, 60);
  const stationCounts = Array.from({ length: 5 }, (_, index) => main.filter((step) => step.round === index + 1
    && !step.linkedSet).length);
  assert.deepEqual(stationCounts, [3, 3, 3, 3, 3]);
  assert.ok([2, 4].every((round) => main.some((step) => step.round === round && step.exerciseName !== 'Standard Push-Up' && step.durationSecs > 0)));
  assert.deepEqual(plan.linkedExercises?.[0].sets.map((set) => set.targetReps), [6, 6, 6]);
  assert.ok((plan.estimatedDurationSecs ?? 0) <= 20 * 60);
});

test('a custom circuit explains when fixed work cannot fit', () => {
  assert.throws(() => generateWorkout({
    time: 15, energy: 'low', focus: 'full body', attachment: 'handles', circuitRounds: 5,
    fixedStations: [
      { id: 'one', exerciseId: 'bodyweight-standard-push-up', mode: 'time', seconds: 45, frequency: 'every-round' },
      { id: 'two', exerciseId: 'random-core', mode: 'time', seconds: 45, frequency: 'every-round' },
      { id: 'three', exerciseId: 'bodyweight-knee-push-up', mode: 'time', seconds: 45, frequency: 'every-round' }
    ]
  }, true), /need at least/);
});

test('BUILD target comparison ignores the order stations were selected', () => {
  const profile = createInitialBuildProfile({
    pullupEnabled: true, pullupAssistanceLb: 40, pullupCurrentReps: 6, assistanceIncrementLb: 5,
    pushupEnabled: true, pushupVariation: 'standard', pushupCurrentMax: 10
  });
  const plan = generateWorkout({
    time: 30, energy: 'normal', focus: 'full body', attachment: 'handles', circuitRounds: 5,
    fixedStations: [
      { id: 'push', exerciseId: 'build-push-up', mode: 'build', frequency: 'every-round' },
      { id: 'pull', exerciseId: 'build-pull-up', mode: 'build', frequency: 'every-round' }
    ]
  }, true, profile);
  assert.deepEqual(plan.linkedExercises?.map((item) => item.kind), ['push-up', 'pull-up']);
  assert.equal(buildTargetsMatchPlan(profile, plan.linkedExercises!), true);
  assert.equal(buildTargetsMatchPlan({ ...profile, rest: { ...profile.rest, pullupSeconds: 120, pushupSeconds: 120 } }, plan.linkedExercises!), true);
  assert.match(formatCircuitRoundPreview(plan, 1), /: \d+r \(BUILD\)/);
  assert.match(formatBuildTargetSummary(plan.linkedExercises![1]), /: \d+r \| \d+r \| \d+r/);
  assert.equal(buildTargetsMatchPlan({ ...profile, pullup: { ...profile.pullup, targetReps: [7, 6, 6] } }, plan.linkedExercises!), false);
});

test('round preview keeps a timed push-up beside a BUILD push-up with the same name', () => {
  const profile = createInitialBuildProfile({
    pullupEnabled: false, pullupAssistanceLb: 0, pullupCurrentReps: 0, assistanceIncrementLb: 5,
    pushupEnabled: true, pushupVariation: 'standard', pushupCurrentMax: 10
  });
  const plan = generateWorkout({
    time: 30, energy: 'normal', focus: 'full body', attachment: 'handles', circuitRounds: 5,
    fixedStations: [
      { id: 'timed', exerciseId: 'bodyweight-standard-push-up', mode: 'time', seconds: 25, frequency: 'every-round' },
      { id: 'build', exerciseId: 'build-push-up', mode: 'build', seconds: 20, frequency: 'every-round' }
    ]
  }, true, profile);
  const preview = formatCircuitRoundPreview(plan, 1);
  assert.match(preview, /Standard Push-Up: 25s/);
  assert.match(preview, /Standard Push-Up: 20s \(BUILD\)/);
  assert.doesNotMatch(preview, /\d+r/);
  assert.equal(plan.intervalSteps.filter((step) => step.isLinkedWork).length, plan.linkedExercises![0].sets.length);
});

test('timed and BUILD push-ups are separated throughout a mixed circuit', () => {
  const profile = createInitialBuildProfile({
    pullupEnabled: true, pullupAssistanceLb: 40, pullupCurrentReps: 6, assistanceIncrementLb: 5,
    pushupEnabled: true, pushupVariation: 'standard', pushupCurrentMax: 10
  });
  for (let sample = 0; sample < 20; sample += 1) {
    const plan = generateWorkout({
      time: 20, energy: 'normal', focus: 'full body', attachment: 'handles', circuitRounds: 5,
      fixedStations: [
        { id: 'pull', exerciseId: 'build-pull-up', mode: 'build', seconds: 20, frequency: 'every-round' },
        { id: 'build-push', exerciseId: 'build-push-up', mode: 'build', seconds: 20, frequency: 'every-round' },
        { id: 'timed-push', exerciseId: 'bodyweight-standard-push-up', mode: 'time', seconds: 25, frequency: 'every-round' }
      ]
    }, true, profile);
    const stations = plan.intervalSteps.filter((step) => step.section === 'main' && !step.isRest);
    for (let index = 1; index < stations.length; index += 1) {
      assert.equal(stations[index - 1].exerciseName?.includes('Push-Up') && stations[index].exerciseName?.includes('Push-Up'), false);
    }
  }
});

test('BUILD push-up sets stay separated when there are more sets than circuit rounds', () => {
  const profile = createInitialBuildProfile({
    pullupEnabled: true, pullupAssistanceLb: 40, pullupCurrentReps: 6, assistanceIncrementLb: 5,
    pushupEnabled: true, pushupVariation: 'standard', pushupCurrentMax: 10
  });
  for (const rounds of [3, 4, 5] as const) {
    const plan = generateWorkout({
      time: 20, energy: 'normal', focus: 'full body', attachment: 'handles', circuitRounds: rounds,
      fixedStations: [
        { id: 'pull', exerciseId: 'build-pull-up', mode: 'build', seconds: 20, frequency: 'every-round' },
        { id: 'push', exerciseId: 'build-push-up', mode: 'build', seconds: 20, frequency: 'every-round' }
      ]
    }, true, profile);
    const stations = plan.intervalSteps.filter((step) => step.section === 'main' && !step.isRest);
    for (let index = 1; index < stations.length; index += 1) {
      assert.equal(stations[index - 1].exerciseName?.includes('Push-Up') && stations[index].exerciseName?.includes('Push-Up'), false);
    }
  }
});

test('random fillers leave space between movements in a BUILD pull-up circuit', () => {
  const profile = createInitialBuildProfile({
    pullupEnabled: true, pullupAssistanceLb: 40, pullupCurrentReps: 6, assistanceIncrementLb: 5,
    pushupEnabled: false, pushupVariation: 'standard', pushupCurrentMax: 10
  });
  for (let sample = 0; sample < 30; sample += 1) {
    const plan = generateWorkout({
      time: 20, energy: 'normal', focus: 'full body', attachment: 'handles', circuitRounds: 5,
      fixedStations: [{ id: 'pull', exerciseId: 'build-pull-up', mode: 'build', frequency: 'every-round' }]
    }, true, profile);
    const stations = plan.intervalSteps.filter((step) => step.section === 'main' && !step.isRest);
    for (let index = 1; index < stations.length; index += 1) {
      assert.notEqual(stations[index - 1].exerciseName, stations[index].exerciseName);
    }
  }
});
