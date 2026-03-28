import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import InventoryPage from './pages/InventoryPage'
import ReplenishmentPage from './pages/ReplenishmentPage'
import ProjectionsPage from './pages/ProjectionsPage'
import EventsPage from './pages/EventsPage'

const ADMIN_EMAILS = ['harsha@pricedab.com', 'harsha@bysolum.com']

function ProtectedRoute({ session, children }) {
  const location = useLocation()

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const email = session.user?.email
  if (!ADMIN_EMAILS.includes(email)) {
    return (
      <div className="access-denied">
        <h1>ACCESS DENIED</h1>
        <p>Your account ({email}) is not authorised to access this panel.</p>
        <button
          className="btn btn-secondary"
          style={{ marginTop: '8px' }}
          onClick={() => supabase.auth.signOut()}
        >
          Sign Out
        </button>
      </div>
    )
  }

  return children
}

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Still loading initial session
  if (session === undefined) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        Loading...
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage session={session} />} />
      <Route
        path="/"
        element={
          <ProtectedRoute session={session}>
            <Layout session={session} />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="replenishment" element={<ReplenishmentPage />} />
        <Route path="projections" element={<ProjectionsPage />} />
        <Route path="events" element={<EventsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
