import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { EnvProvider, useEnv } from './context/EnvContext'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import OrdersPage from './pages/OrdersPage'
import StockPage from './pages/StockPage'
import PaymentsPage from './pages/PaymentsPage'
import BookkeepingPage from './pages/BookkeepingPage'
import SubscribersPage from './pages/SubscribersPage'
import LoginPage from './pages/LoginPage'
import './admin.css'

const ADMIN_EMAILS = ['harsha@pricedab.com', 'harsha@bysolum.com']

function AppInner() {
  const { env, config } = useEnv()
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    setSession(undefined)
    config.authClient.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = config.authClient.auth.onAuthStateChange((event, session) => {
      if (event !== 'INITIAL_SESSION') setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [env, config.client])

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
          <Route path="orders" element={<OrdersPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="stock" element={<StockPage />} />
          <Route path="bookkeeping" element={<BookkeepingPage />} />
          <Route path="subscribers" element={<SubscribersPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <EnvProvider>
      <AppInner />
    </EnvProvider>
  )
}
