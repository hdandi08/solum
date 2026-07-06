// Pure, dependency-free outreach-sequence logic. Imported by the edge function
// (Deno supports .mjs) and unit-tested with node --test.
export const SEQUENCE = [
  { step: 1, key: 'intro',     offsetDays: 0 },
  { step: 2, key: 'follow_up', offsetDays: 3 },
  { step: 3, key: 'final',     offsetDays: 7 },
];

const TERMINAL_STAGES = new Set(['in_talks', 'active', 'declined', 'archived']);
const DAY_MS = 86400000;

// The next email to send for this creator right now, or null if not due/stopped/done.
export function dueStep(creator, now = new Date()) {
  if (creator.sequence_status !== 'active') return null;
  if (creator.unsubscribed) return null;
  if (TERMINAL_STAGES.has(creator.stage)) return null;
  const nextStep = (creator.sequence_step ?? 0) + 1;
  if (nextStep > SEQUENCE.length) return null;
  if (creator.next_email_at && new Date(creator.next_email_at) > now) return null;
  const s = SEQUENCE[nextStep - 1];
  return { step: s.step, key: s.key };
}

// Row update to apply after step `sentStep` was successfully sent.
export function computeAfterSend(sentStep, createdAt) {
  const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const next = SEQUENCE[sentStep]; // SEQUENCE[sentStep] is the step AFTER sentStep (0-indexed)
  if (!next) return { sequence_status: 'completed', next_email_at: null };
  return {
    sequence_status: 'active',
    next_email_at: new Date(created.getTime() + next.offsetDays * DAY_MS).toISOString(),
  };
}
