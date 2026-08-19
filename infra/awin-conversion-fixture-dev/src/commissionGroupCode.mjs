const COMMISSION_GROUP_CODE = /^[A-Z0-9_]{1,50}$/

/**
 * Fixture-local equivalent of the Phase B canonical group-code validator.
 * The SAM CodeUri packages only this directory; the Deno suite cross-checks
 * this predicate against normalizeCommissionGroupCode.
 *
 * @param {unknown} value
 */
export function isFixtureCommissionGroupCode(value) {
  return typeof value === 'string' && COMMISSION_GROUP_CODE.test(value)
}
