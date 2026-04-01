import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import InventoryPage from './pages/InventoryPage'
import ReplenishmentPage from './pages/ReplenishmentPage'
import ProjectionsPage from './pages/ProjectionsPage'
import EventsPage from './pages/EventsPage'
import OrdersPage from './pages/OrdersPage'
import CostsPage from './pages/CostsPage'
import LoginPage from './pages/LoginPage'
import './admin.css'

const ADMIN_EMAILS = ['harsha@pricedab.com', 'harsha@bysolum.com']

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== 'INITIAL_SESSION') setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null

  const isAdmin = session && ADMIN_EMAILS.includes(session.user?.email)

  if (!isAdmin) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout session={session} />}>
          <Route index element={<DashboardPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="replenishment" element={<ReplenishmentPage />} />
          <Route path="costs" element={<CostsPage />} />
          <Route path="projections" element={<ProjectionsPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="events" element={<EventsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
