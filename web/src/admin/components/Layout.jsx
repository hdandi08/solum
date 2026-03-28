import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/inventory', label: 'Inventory' },
  { to: '/admin/replenishment', label: 'Replenishment' },
  { to: '/admin/projections', label: 'Projections' },
  { to: '/admin/events', label: 'Events' },
]

export default function Layout({ session }) {
  const email = session?.user?.email

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-top">
          <span className="sidebar-wordmark">SOLUM</span>
          <span className="sidebar-ops-label">OPS</span>
        </div>

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

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
