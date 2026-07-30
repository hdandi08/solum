import { useEffect, useState } from 'react'
import { isValidMfaCode } from '../lib/authState'
import { supabase } from '../lib/supabase'

function qrSource(value) {
  if (!value) return ''
  return value.startsWith('data:')
    ? value
    : `data:image/svg+xml;utf-8,${encodeURIComponent(value)}`
}

export default function MfaGate({ mode, onVerified }) {
  const [factorId, setFactorId] = useState('')
  const [enrollment, setEnrollment] = useState(null)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function prepare() {
      setLoading(true)
      setError('')
      const factorsResult = await supabase.auth.mfa.listFactors()
      if (!active) return
      if (factorsResult.error) {
        setError('MFA configuration could not be loaded.')
        setLoading(false)
        return
      }

      const verified = factorsResult.data.totp[0]
      if (mode === 'challenge_mfa') {
        if (!verified) {
          setError('No verified authenticator factor is available.')
        } else {
          setFactorId(verified.id)
        }
        setLoading(false)
        return
      }

      if (verified) {
        await onVerified()
        return
      }

      const enrollResult = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'SOLUM Admin',
      })
      if (!active) return
      if (enrollResult.error || !enrollResult.data?.totp) {
        setError('Authenticator enrolment could not be started.')
      } else {
        setFactorId(enrollResult.data.id)
        setEnrollment({
          qrCode: enrollResult.data.totp.qr_code,
          secret: enrollResult.data.totp.secret,
        })
      }
      setLoading(false)
    }

    prepare()
    return () => {
      active = false
    }
  }, [mode, onVerified])

  async function handleSubmit(event) {
    event.preventDefault()
    if (!isValidMfaCode(code)) {
      setError('Enter the six-digit code from your authenticator app.')
      return
    }
    if (!factorId) {
      setError('Authenticator setup is not ready.')
      return
    }

    setVerifying(true)
    setError('')
    const challenge = await supabase.auth.mfa.challenge({ factorId })
    if (challenge.error || !challenge.data?.id) {
      setError('The authenticator challenge could not be created.')
      setVerifying(false)
      return
    }

    const verification = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code,
    })
    if (verification.error) {
      setError('That code was not accepted. Wait for a new code and retry.')
      setVerifying(false)
      return
    }

    const assurance = await supabase.auth.mfa
      .getAuthenticatorAssuranceLevel()
    if (
      assurance.error
      || assurance.data?.currentLevel !== 'aal2'
    ) {
      setError('MFA verification did not raise this session to AAL2.')
      setVerifying(false)
      return
    }

    const refreshed = await supabase.auth.refreshSession()
    if (refreshed.error) {
      setError('The verified session could not be refreshed.')
      setVerifying(false)
      return
    }
    await onVerified()
  }

  if (loading) {
    return (
      <div className="login-page">
        <div className="loading-state">
          <div className="loading-spinner" />
          Preparing secure access...
        </div>
      </div>
    )
  }

  const enrolling = mode === 'enrol_mfa'
  return (
    <div className="login-page">
      <div className="login-box mfa-box">
        <div style={{ textAlign: 'center' }}>
          <div className="login-wordmark">SOLUM</div>
          <div className="login-subtitle">Admin MFA</div>
        </div>

        <div className="login-card">
          <div className="login-card-title">
            {enrolling ? 'Set up authenticator' : 'Verify authenticator'}
          </div>
          <p className="mfa-copy">
            {enrolling
              ? 'Scan this code in your authenticator app, then enter the current six-digit code.'
              : 'Enter the current six-digit code from your authenticator app.'}
          </p>

          {enrolling && enrollment && (
            <div className="mfa-enrollment">
              <img
                className="mfa-qr"
                src={qrSource(enrollment.qrCode)}
                alt="SOLUM Admin authenticator QR code"
              />
              <div className="mfa-secret-label">Manual setup key</div>
              <code className="mfa-secret">{enrollment.secret}</code>
            </div>
          )}

          {error && <div className="login-error">{error}</div>}

          <form className="mfa-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="mfa-code">
                Six-digit code
              </label>
              <input
                id="mfa-code"
                className="input mfa-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={event =>
                  setCode(event.target.value.replace(/[^0-9]/g, ''))}
                required
                autoFocus={!enrolling}
              />
            </div>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={verifying || !factorId}
            >
              {verifying ? 'Verifying...' : 'Verify and continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
