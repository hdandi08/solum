import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import InventoryPage from './pages/InventoryPage'
import ReplenishmentPage from './pages/ReplenishmentPage'
import ProjectionsPage from './pages/ProjectionsPage'
import EventsPage from './pages/EventsPage'

const ADMIN_EMAILS = ['harsha@pricedab.com', 'harsha@bysolum.com']

function ProtectedRoute({ session, children }) {
  const email = session?.user?.email
  if (!session || !ADMIN_EMAILS.includes(email)) {
    window.location.replace('/')
    return null
  }
  return children
}

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    // Use getSession() for initial load — avoids race with onAuthStateChange INITIAL_SESSION null
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // Only handle subsequent auth changes (sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== 'INITIAL_SESSION') setSession(session)
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
