import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function LoginPage({ session }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const from = location.state?.from?.pathname || '/'

  useEffect(() => {
    if (session) {
      navigate(from, { replace: true })
    }
  }, [session, navigate, from])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError('')

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin,
      },
    })

    setLoading(false)

    if (authError) {
      setError(authError.message || 'Failed to send magic link. Please try again.')
    } else {
      setSent(true)
    }
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div style={{ textAlign: 'center' }}>
          <div className="login-wordmark">SOLUM</div>
          <div className="login-subtitle">Admin Panel</div>
        </div>

        <div className="login-card">
          {sent ? (
            <div className="login-success">
              Check your email for a login link.
            </div>
          ) : (
            <>
              <div className="login-card-title">Sign in to continue</div>

              {error && (
                <div className="login-error">{error}</div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="email">Email address</label>
                  <input
                    id="email"
                    type="email"
                    className="input"
                    placeholder="harsha@bysolum.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ width: '100%', justifyContent: 'center', padding: '11px 18px' }}
                >
                  {loading ? 'Sending...' : 'Send Magic Link'}
                </button>
              </form>
            </>
          )}
        </div>

        <div style={{ fontSize: '11px', color: 'var(--bone-muted)', letterSpacing: '0.08em', textAlign: 'center' }}>
          Access restricted to authorised personnel only.
        </div>
      </div>
    </div>
  )
}
