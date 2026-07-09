import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDispatchDate, estDeliveryDate } from './dispatch.mjs';

const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Cutoff is 6 PM UK wall time (updated 2026-07-09, was noon).
// Reference week: Mon 2026-07-06 ... Sun 2026-07-12, Mon 13, Tue 14
test('before 6 PM weekday -> next working day (Mon 17:59 -> Tue)', () => {
  assert.equal(ymd(getDispatchDate(new Date(2026, 6, 6, 17, 59))), '2026-07-07');
});
test('at/after 6 PM weekday -> second working day (Mon 18:00 -> Wed)', () => {
  assert.equal(ymd(getDispatchDate(new Date(2026, 6, 6, 18, 0))), '2026-07-08');
});
test('before 6 PM Friday skips weekend (Fri 9am -> Mon)', () => {
  assert.equal(ymd(getDispatchDate(new Date(2026, 6, 10, 9, 0))), '2026-07-13');
});
test('after 6 PM Friday -> Tuesday', () => {
  assert.equal(ymd(getDispatchDate(new Date(2026, 6, 10, 19, 0))), '2026-07-14');
});
test('weekend orders -> Tuesday (Sat, Sun)', () => {
  assert.equal(ymd(getDispatchDate(new Date(2026, 6, 11, 10, 0))), '2026-07-14');
  assert.equal(ymd(getDispatchDate(new Date(2026, 6, 12, 10, 0))), '2026-07-14');
});
test('never a weekend', () => {
  for (let day = 6; day <= 12; day++) {
    const dow = getDispatchDate(new Date(2026, 6, day, 9, 0)).getDay();
    assert.notEqual(dow, 0);
    assert.notEqual(dow, 6);
  }
});

test('estDeliveryDate = dispatch + 2 working days', () => {
  assert.equal(ymd(estDeliveryDate(new Date(2026, 6, 7))), '2026-07-09'); // Tue -> Thu
  assert.equal(ymd(estDeliveryDate(new Date(2026, 6, 10))), '2026-07-14'); // Fri -> Tue
});
