import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setLoading(false)
    if (authError) setError(authError.message || 'Invalid email or password.')
    // On success, App.jsx re-renders with the new session automatically
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div style={{ textAlign: 'center' }}>
          <div className="login-wordmark">SOLUM</div>
          <div className="login-subtitle">Admin Panel</div>
        </div>

        <div className="login-card">
          <div className="login-card-title">Sign in</div>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email</label>
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

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '11px 18px' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <div style={{ fontSize: '11px', color: 'var(--bone-muted)', letterSpacing: '0.08em', textAlign: 'center' }}>
          Access restricted to authorised personnel only.
        </div>
      </div>
    </div>
  )
}
