import { useState } from 'react'
import { adminEnvironment, supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setLoading(false)
    if (authError) {
      setError('Sign-in failed. Check your credentials and try again.')
    }
  }

  const production = adminEnvironment.isProduction
  const environmentLabel = production ? 'Production' : 'Development'

  return (
    <div className="login-page">
      <div className="login-box">
        <div style={{ textAlign: 'center' }}>
          <div
            className="login-wordmark"
            style={{
              color: production
                ? 'var(--env-prod-color)'
                : 'var(--env-dev-color)',
            }}
          >
            SOLUM
          </div>
          <div className="login-subtitle">Admin Panel</div>
        </div>

        <div className="login-card">
          <div
            className={`login-environment ${
              production
                ? 'login-environment-production'
                : 'login-environment-development'
            }`}
          >
            {environmentLabel} environment
          </div>
          <div className="login-card-title">Administrator sign in</div>

          {error && <div className="login-error">{error}</div>}

          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="input"
                autoComplete="username"
                value={email}
                onChange={event => setEmail(event.target.value)}
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
                autoComplete="current-password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className={`btn ${
                production ? 'btn-login-prod' : 'btn-login-dev'
              }`}
              disabled={loading}
              style={{
                justifyContent: 'center',
                padding: '11px 18px',
                width: '100%',
              }}
            >
              {loading ? 'Signing in...' : `Sign in to ${environmentLabel}`}
            </button>
          </form>
        </div>

        <div className="login-restricted">
          Administrator role and authenticator verification are required.
        </div>
      </div>
    </div>
  )
}
