import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDispatchDate, estDeliveryDate } from './dispatch.mjs';

const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Reference week: Mon 2026-07-06 ... Sun 2026-07-12, Mon 13, Tue 14
test('before noon weekday -> next working day (Mon 9am -> Tue)', () => {
  assert.equal(ymd(getDispatchDate(new Date(2026, 6, 6, 9, 0))), '2026-07-07');
});
test('at/after noon weekday -> second working day (Mon 12:00 -> Wed)', () => {
  assert.equal(ymd(getDispatchDate(new Date(2026, 6, 6, 12, 0))), '2026-07-08');
});
test('before noon Friday skips weekend (Fri 9am -> Mon)', () => {
  assert.equal(ymd(getDispatchDate(new Date(2026, 6, 10, 9, 0))), '2026-07-13');
});
test('after noon Friday -> Tuesday', () => {
  assert.equal(ymd(getDispatchDate(new Date(2026, 6, 10, 14, 0))), '2026-07-14');
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
