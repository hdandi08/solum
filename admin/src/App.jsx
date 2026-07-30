import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'
import Layout from './components/Layout'
import MfaGate from './components/MfaGate'
import { resolveAdminAuthStep } from './lib/authState'
import { supabase } from './lib/supabase'
import DashboardPage from './pages/DashboardPage'
import EventsPage from './pages/EventsPage'
import LoginPage from './pages/LoginPage'
import OrdersPage from './pages/OrdersPage'
import './admin.css'

function LoadingPage() {
  return (
    <div className="login-page">
      <div className="loading-state">
        <div className="loading-spinner" />
        Verifying secure access...
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined)
  const [aal, setAal] = useState(undefined)
  const [factors, setFactors] = useState(undefined)
  const [authError, setAuthError] = useState('')
  const refreshSequence = useRef(0)

  const refreshAuth = useCallback(async (knownSession) => {
    const sequence = ++refreshSequence.current
    setAuthError('')

    let resolvedSession = knownSession
    if (knownSession === undefined) {
      const sessionResult = await supabase.auth.getSession()
      if (sequence !== refreshSequence.current) return
      if (sessionResult.error) {
        setAuthError('The administrator session could not be loaded.')
        return
      }
      resolvedSession = sessionResult.data.session
    }

    setSession(resolvedSession)
    if (!resolvedSession) {
      setAal(null)
      setFactors([])
      return
    }
    if (resolvedSession.user?.app_metadata?.role !== 'admin') {
      setAal(null)
      setFactors([])
      return
    }

    setAal(undefined)
    setFactors(undefined)
    const [factorResult, assuranceResult] = await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ])
    if (sequence !== refreshSequence.current) return
    if (
      factorResult.error
      || assuranceResult.error
      || !factorResult.data
      || !assuranceResult.data
    ) {
      setAuthError('MFA status could not be verified.')
      return
    }

    setFactors(factorResult.data.all)
    setAal(assuranceResult.data.currentLevel)
  }, [])

  useEffect(() => {
    refreshAuth()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        queueMicrotask(() => refreshAuth(nextSession))
      },
    )
    return () => subscription.unsubscribe()
  }, [refreshAuth])

  const step = resolveAdminAuthStep({ session, aal, factors })

  if (authError) {
    return (
      <div className="access-denied">
        <h1>Access check failed</h1>
        <p>{authError}</p>
        <button className="btn btn-secondary" onClick={() => refreshAuth()}>
          Retry
        </button>
      </div>
    )
  }
  if (step === 'loading') return <LoadingPage />
  if (step === 'signed_out') {
    return (
      <BrowserRouter>
        <Navigate to="/login" replace />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </BrowserRouter>
    )
  }
  if (step === 'forbidden') {
    return (
      <div className="access-denied">
        <h1>Administrator role required</h1>
        <p>
          {session.user.email || 'This account'} does not have the protected
          administrator role.
        </p>
        <button
          className="btn btn-secondary"
          onClick={() => supabase.auth.signOut()}
        >
          Sign Out
        </button>
      </div>
    )
  }
  if (step === 'enrol_mfa' || step === 'challenge_mfa') {
    return <MfaGate mode={step} onVerified={refreshAuth} />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout session={session} />}>
          <Route index element={<DashboardPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="events" element={<EventsPage />} />
        </Route>
        <Route path="/login" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
