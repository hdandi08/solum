import { useMemo } from 'react';
import { AB_TESTS } from '../data/abtests';
import { capture } from '../lib/analytics';

const STORAGE_KEY = 'solum_ab_assignments';

function getAssignments() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveAssignment(testId, variant) {
  try {
    const assignments = getAssignments();
    assignments[testId] = variant;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
  } catch {
    // localStorage blocked (private mode etc) — assignment is ephemeral
  }
}

function assign(test, testId) {
  const variants = test.variants;
  const traffic = test.traffic ?? 1.0;

  // Roll dice: is this visitor in the test at all?
  if (Math.random() > traffic) return 'control';

  // Assign uniformly across variants
  const index = Math.floor(Math.random() * variants.length);
  const variant = variants[index];

  saveAssignment(testId, variant);
  capture('ab_assigned', { test: testId, variant });

  return variant;
}

// useVariant('hero-cta-copy') → 'control' | 'ritual'
// Returns 'control' if test is paused, completed, or not found.
export function useVariant(testId) {
  return useMemo(() => {
    const test = AB_TESTS[testId];
    if (!test || test.status !== 'active') return 'control';

    const existing = getAssignments()[testId];
    if (existing) return existing;

    return assign(test, testId);
  }, [testId]);
}

// Call this when a conversion event fires — tags it with the visitor's active variants.
// trackGoal('checkout_started', { kit: 'ritual' })
export function trackGoal(event, props = {}) {
  const assignments = getAssignments();
  capture(event, { ...props, ...assignments });
}
