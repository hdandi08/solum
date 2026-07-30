import { NavLink, Outlet } from 'react-router-dom'
import { adminEnvironment, supabase } from '../lib/supabase'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/orders', label: 'Orders' },
  { to: '/events', label: 'Events' },
]

export default function Layout({ session }) {
  const production = adminEnvironment.isProduction
  const environmentClass = production ? 'prod' : 'dev'
  const environmentLabel = production ? 'PRODUCTION' : 'DEVELOPMENT'

  return (
    <div className={`layout layout-env-${environmentClass}`}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <span className="sidebar-wordmark">SOLUM</span>
          <span className="sidebar-ops-label">OPS</span>
        </div>

        <div className="env-pill env-pill-static">
          <span className="env-dot" />
          <span className="env-label">{environmentLabel}</span>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `nav-link${isActive ? ' active' : ''}`}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="sidebar-email">{session.user.email}</span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => supabase.auth.signOut()}
          >
            Sign Out
          </button>
        </div>
      </aside>

      <div className="main-column">
        <div className="env-banner">
          <span className="env-banner-dot" />
          {production
            ? 'PRODUCTION — changes affect live customer data'
            : 'DEVELOPMENT — test data only · not visible to customers'}
        </div>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
