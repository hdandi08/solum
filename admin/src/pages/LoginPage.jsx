import { useState } from 'react'
import { useEnv } from '../context/EnvContext'

export default function LoginPage() {
  const { config, env, switchEnv } = useEnv()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: authError } = await config.authClient.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setLoading(false)
    if (authError) setError(authError.message || 'Invalid email or password.')
  }

  const isProd = env === 'prod'

  return (
    <div className="login-page">
      <div className="login-box">
        <div style={{ textAlign: 'center' }}>
          <div className="login-wordmark" style={{ color: isProd ? 'var(--env-prod-color)' : 'var(--env-dev-color)' }}>
            SOLUM
          </div>
          <div className="login-subtitle">Admin Panel</div>
        </div>

        <div className="login-card">
          <div className="login-env-switcher">
            <button
              className={`login-env-btn ${isProd ? 'login-env-btn-active-prod' : 'login-env-btn-prod'}`}
              onClick={() => switchEnv('prod')}
              type="button"
            >
              ⬤ PROD
            </button>
            <button
              className={`login-env-btn ${!isProd ? 'login-env-btn-active-dev' : 'login-env-btn-dev'}`}
              onClick={() => switchEnv('dev')}
              type="button"
            >
              ⚠ DEV
            </button>
          </div>

          <div className="login-card-title">
            Sign in to {isProd ? 'Production' : 'Development'}
          </div>

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
              className={`btn ${isProd ? 'btn-login-prod' : 'btn-login-dev'}`}
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '11px 18px' }}
            >
              {loading ? 'Signing in...' : `Sign In to ${isProd ? 'PROD' : 'DEV'}`}
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
