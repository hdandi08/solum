import { NavLink, Outlet } from 'react-router-dom'
import { useState } from 'react'
import { useEnv } from '../context/EnvContext'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/orders', label: 'Orders' },
  { to: '/payments', label: 'Payments' },
  { to: '/stock', label: 'Stock' },
  { to: '/bookkeeping', label: 'Bookkeeping' },
  { to: '/subscribers', label: 'Subscribers' },
]

export default function Layout({ session }) {
  const email = session?.user?.email
  const { env, config, switchEnv } = useEnv()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmInput, setConfirmInput] = useState('')

  const handleSignOut = async () => {
    await config.authClient.auth.signOut()
  }

  const isProd = env === 'prod'
  const targetEnv = isProd ? 'dev' : 'prod'
  const needsTypedConfirm = !isProd

  const openConfirm = () => { setConfirmInput(''); setConfirmOpen(true) }
  const closeConfirm = () => { setConfirmInput(''); setConfirmOpen(false) }
  const doSwitch = () => { switchEnv(targetEnv); closeConfirm() }
  const canConfirm = needsTypedConfirm ? confirmInput.trim().toLowerCase() === 'prod' : true

  return (
    <div className={`layout layout-env-${env}`}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <span className="sidebar-wordmark">SOLUM</span>
          <span className="sidebar-ops-label">OPS</span>
        </div>

        <button className="env-pill" onClick={openConfirm}>
          <span className="env-dot" />
          <span className="env-label">{isProd ? 'PROD' : 'DEV'}</span>
          <span className="env-switch-hint">switch</span>
        </button>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="sidebar-email">{email}</span>
          <button className="btn btn-secondary btn-sm" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </aside>

      <div className="main-column">
        <div className="env-banner">
          <span className="env-banner-dot" />
          {isProd
            ? 'PRODUCTION — changes affect live customer data'
            : 'DEVELOPMENT — test data only · not visible to customers'}
          <button className="env-banner-switch" onClick={openConfirm}>
            switch to {targetEnv}
          </button>
        </div>

        <main className="main-content">
          <Outlet />
        </main>
      </div>

      {confirmOpen && (
        <div className="modal-backdrop" onClick={closeConfirm}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              Switch to {targetEnv === 'prod' ? 'Production' : 'Development'}?
            </div>

            {needsTypedConfirm ? (
              <>
                <p className="modal-body">
                  You are switching to <strong style={{ color: 'var(--env-prod-color)' }}>PRODUCTION</strong> — all changes affect real, live customer data.
                  <br /><br />
                  Type <strong>prod</strong> to confirm.
                </p>
                <input
                  className="input"
                  placeholder="Type prod to confirm"
                  value={confirmInput}
                  onChange={e => setConfirmInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && canConfirm && doSwitch()}
                  autoFocus
                  style={{ marginBottom: '20px' }}
                />
              </>
            ) : (
              <p className="modal-body">
                You will switch back to <strong style={{ color: 'var(--env-dev-color)' }}>DEV</strong>. Changes will only affect test data.
              </p>
            )}

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={closeConfirm}>Cancel</button>
              <button
                className={`btn ${needsTypedConfirm ? 'btn-danger' : 'btn-warning'}`}
                onClick={doSwitch}
                disabled={!canConfirm}
              >
                Switch to {targetEnv.toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
