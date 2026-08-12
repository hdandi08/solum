const FIXTURE_REFS = new Set([
  'pi_s2s429dev0001',
  'pi_s2s500dev0001',
  'pi_s2s200dev0001',
  'pi_s2s206okdev001',
  'pi_s2s206faildev1',
])

export const ACCEPTANCE_NEXT_ATTEMPT_AT = '2000-01-01T00:00:00.000Z'

export function planAcceptanceClaim(orderRefs) {
  if (
    !Array.isArray(orderRefs) || orderRefs.length < 1 || orderRefs.length > 2 ||
    new Set(orderRefs).size !== orderRefs.length ||
    orderRefs.some((orderRef) => !FIXTURE_REFS.has(orderRef))
  ) {
    throw new TypeError('acceptance claim scope is invalid')
  }
  return {
    orderRefs: [...orderRefs],
    nextAttemptAt: ACCEPTANCE_NEXT_ATTEMPT_AT,
    limit: orderRefs.length,
  }
}
