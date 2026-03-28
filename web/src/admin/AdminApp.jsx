import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import InventoryPage from './pages/InventoryPage'
import ReplenishmentPage from './pages/ReplenishmentPage'
import ProjectionsPage from './pages/ProjectionsPage'
import EventsPage from './pages/EventsPage'
import './admin.css'

const ADMIN_EMAILS = ['harsha@pricedab.com', 'harsha@bysolum.com']

export default function AdminApp() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== 'INITIAL_SESSION') setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Still loading
  if (session === undefined) return null

  // Not logged in or not whitelisted — redirect silently to home
  const email = session?.user?.email
  if (!session || !ADMIN_EMAILS.includes(email)) {
    window.location.replace('/')
    return null
  }

  return (
    <Routes>
      <Route path="/" element={<Layout session={session} />}>
        <Route index element={<DashboardPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="replenishment" element={<ReplenishmentPage />} />
        <Route path="projections" element={<ProjectionsPage />} />
        <Route path="events" element={<EventsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}
