import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEQUENCE, dueStep, computeAfterSend } from './sequence.mjs';

const base = (over = {}) => ({
  sequence_status: 'active', sequence_step: 0, unsubscribed: false,
  stage: 'contacted', next_email_at: null, created_at: '2026-07-06T09:00:00Z', ...over,
});

test('SEQUENCE has 3 steps at day 0/3/7', () => {
  assert.deepEqual(SEQUENCE.map(s => s.offsetDays), [0, 3, 7]);
});

test('step 0 with no next_email_at is due for intro', () => {
  assert.deepEqual(dueStep(base(), new Date('2026-07-06T09:00:00Z')), { step: 1, key: 'intro' });
});

test('not due when next_email_at is in the future', () => {
  const c = base({ sequence_step: 1, next_email_at: '2026-07-09T09:00:00Z' });
  assert.equal(dueStep(c, new Date('2026-07-07T09:00:00Z')), null);
});

test('due for follow_up once next_email_at has passed', () => {
  const c = base({ sequence_step: 1, next_email_at: '2026-07-09T09:00:00Z' });
  assert.deepEqual(dueStep(c, new Date('2026-07-09T10:00:00Z')), { step: 2, key: 'follow_up' });
});

test('stopped when stage is terminal', () => {
  assert.equal(dueStep(base({ stage: 'in_talks' }), new Date('2026-07-06T09:00:00Z')), null);
});

test('stopped when unsubscribed or not active', () => {
  assert.equal(dueStep(base({ unsubscribed: true }), new Date()), null);
  assert.equal(dueStep(base({ sequence_status: 'stopped' }), new Date()), null);
});

test('nothing left after step 3', () => {
  assert.equal(dueStep(base({ sequence_step: 3 }), new Date('2027-01-01')), null);
});

test('computeAfterSend schedules step 2 at +3 days', () => {
  const r = computeAfterSend(1, new Date('2026-07-06T09:00:00Z'));
  assert.equal(r.sequence_status, 'active');
  assert.equal(r.next_email_at, new Date('2026-07-09T09:00:00Z').toISOString());
});

test('computeAfterSend schedules step 3 at +7 days', () => {
  const r = computeAfterSend(2, new Date('2026-07-06T09:00:00Z'));
  assert.equal(r.next_email_at, new Date('2026-07-13T09:00:00Z').toISOString());
});

test('computeAfterSend completes after step 3', () => {
  assert.deepEqual(computeAfterSend(3, new Date('2026-07-06T09:00:00Z')),
    { sequence_status: 'completed', next_email_at: null });
});
