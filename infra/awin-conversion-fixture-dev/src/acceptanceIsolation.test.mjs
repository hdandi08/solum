import test from 'node:test'
import assert from 'node:assert/strict'
import { planAcceptanceClaim } from './acceptanceIsolation.mjs'

test('an unrelated row arriving after preflight cannot enter the exact acceptance claim', () => {
  const expectedRefs = ['pi_s2s206okdev001', 'pi_s2s206faildev1']
  const plan = planAcceptanceClaim(expectedRefs)
  const rowsAfterConcurrentEnqueue = [
    ...expectedRefs.map((orderRef, index) => ({
      orderRef,
      nextAttemptAt: plan.nextAttemptAt,
      createdAt: `2026-08-12T14:00:0${index}.000Z`,
    })),
    {
      orderRef: 'pi_s2sunrelated01',
      nextAttemptAt: '2026-08-12T14:00:03.000Z',
      createdAt: '2026-08-12T14:00:03.000Z',
    },
  ]

  const claimed = rowsAfterConcurrentEnqueue
    .sort((left, right) =>
      left.nextAttemptAt.localeCompare(right.nextAttemptAt) ||
      left.createdAt.localeCompare(right.createdAt) ||
      left.orderRef.localeCompare(right.orderRef)
    )
    .slice(0, plan.limit)
    .map(({ orderRef }) => orderRef)

  assert.deepEqual(new Set(claimed), new Set(expectedRefs))
  assert.equal(claimed.includes('pi_s2sunrelated01'), false)
  assert.deepEqual(plan, {
    orderRefs: expectedRefs,
    nextAttemptAt: '2000-01-01T00:00:00.000Z',
    limit: 2,
  })
})

test('acceptance claim plans reject empty, duplicate, or non-fixture references', () => {
  for (const refs of [
    [],
    ['pi_s2s200dev0001', 'pi_s2s200dev0001'],
    ['pi_s2sunrelated01'],
  ]) {
    assert.throws(() => planAcceptanceClaim(refs), /acceptance claim scope is invalid/)
  }
})
