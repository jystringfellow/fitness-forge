import assert from 'node:assert/strict';
import test from 'node:test';
import { getInitialPushupProgramWeek, getPushupProgramPrescription, PUSHUP_PROGRAM, selectPushupBracket } from '@/data/pushupProgram';

function prescription(week: number, day: number, baselineMax: number) {
  return getPushupProgramPrescription({ programWeek: week, programDay: day, baselineMax });
}

test('push-up program contains all 18 table-driven sessions', () => {
  assert.equal(PUSHUP_PROGRAM.length, 6);
  assert.equal(PUSHUP_PROGRAM.flatMap((week) => week.days).length, 18);
  for (const week of PUSHUP_PROGRAM) {
    assert.equal(week.brackets.length, 3);
    assert.equal(week.days.length, 3);
    for (const day of week.days) {
      assert.equal(day.columns.length, 3);
      assert.ok(day.columns.every((column) => column.length === day.columns[0].length));
    }
  }
});

test('canonical sessions match the supplied program tables exactly', () => {
  assert.deepEqual(prescription(1, 1, 18).sets.map((set) => set.reps), [10, 12, 7, 7, 9]);
  assert.deepEqual(prescription(2, 3, 8).sets.map((set) => set.reps), [12, 13, 10, 10, 15]);
  assert.deepEqual(prescription(3, 3, 30).sets.map((set) => set.reps), [22, 30, 20, 20, 28]);
  assert.deepEqual(prescription(4, 1, 23).sets.map((set) => set.reps), [18, 22, 16, 16, 25]);
  assert.deepEqual(prescription(5, 2, 38).sets.map((set) => set.reps), [18, 18, 20, 20, 14, 14, 16, 40]);
  assert.deepEqual(prescription(6, 3, 55).sets.map((set) => set.reps), [22, 22, 30, 30, 25, 25, 18, 18, 55]);
});

test('every final set is a semantic minimum while earlier sets remain fixed', () => {
  for (const week of PUSHUP_PROGRAM) {
    for (const day of week.days) {
      for (const bracket of week.brackets) {
        const session = prescription(week.week, day.day, bracket.minReps);
        assert.equal(session.sets.at(-1)?.type, 'minimum');
        assert.ok(session.sets.slice(0, -1).every((set) => set.type === 'fixed'));
      }
    }
  }
});

test('Weeks 5 and 6 preserve high set counts and prescribed rest', () => {
  assert.equal(prescription(5, 1, 33).sets.length, 5);
  assert.equal(prescription(5, 2, 33).sets.length, 8);
  assert.equal(prescription(5, 3, 33).sets.length, 8);
  assert.equal(prescription(6, 1, 48).sets.length, 5);
  assert.equal(prescription(6, 2, 48).sets.length, 9);
  assert.equal(prescription(6, 3, 48).sets.length, 9);
  assert.deepEqual(PUSHUP_PROGRAM.map((week) => week.days.map((day) => day.restSeconds)), [
    [60, 60, 60], [60, 90, 120], [60, 90, 120], [60, 90, 120], [60, 45, 45], [60, 45, 45]
  ]);
});

test('bracket selection clamps safely outside a phase range', () => {
  assert.equal(selectPushupBracket(1, 5).id, 'under-5');
  assert.equal(selectPushupBracket(1, 8).id, '6-10');
  assert.equal(selectPushupBracket(1, 30).id, '11-20');
  assert.equal(selectPushupBracket(3, 12).id, '16-20');
  assert.equal(selectPushupBracket(5, 39).id, '36-40');
  assert.equal(selectPushupBracket(6, 70).id, 'over-60');
});

test('an initial max above 20 enters Week 3 while later phases remain reassessment-gated', () => {
  assert.equal(getInitialPushupProgramWeek(20), 1);
  assert.equal(getInitialPushupProgramWeek(21), 3);
  assert.equal(getInitialPushupProgramWeek(60), 3);
});
