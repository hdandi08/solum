export function resolveAdminAuthStep({ session, aal, factors }) {
  if (session === undefined) return 'loading'
  if (session === null) return 'signed_out'
  if (session.user?.app_metadata?.role !== 'admin') return 'forbidden'
  if (aal === undefined || factors === undefined) return 'loading'

  const hasVerifiedTotp = factors.some(factor =>
    factor.factor_type === 'totp' && factor.status === 'verified')
  if (!hasVerifiedTotp) return 'enrol_mfa'
  if (aal !== 'aal2') return 'challenge_mfa'
  return 'ready'
}

export function isValidMfaCode(code) {
  return /^[0-9]{6}$/.test(code)
}
