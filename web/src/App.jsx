import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import ComingSoon from './pages/ComingSoon';
import FullSite from './pages/FullSite';
import CheckoutPage from './pages/CheckoutPage';
import SuccessPage from './pages/SuccessPage';
import AccountPage from './pages/AccountPage';
import NotFoundPage from './pages/NotFoundPage';
import AdminApp from './admin/AdminApp';
import './styles/global.css';

// If Supabase drops auth tokens on the wrong page (e.g. site root instead of /account),
// pick them up and forward to /account so the session can be established.
function AuthRedirectGuard() {
  useEffect(() => {
    const hash   = window.location.hash
    const params = new URLSearchParams(window.location.search)
    const isAuthCallback = hash.includes('access_token') || hash.includes('error_description') || params.has('code')
    if (isAuthCallback && window.location.pathname !== '/account') {
      window.location.replace('/account' + window.location.search + window.location.hash)
    }
  }, [])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthRedirectGuard />
      <Routes>
        <Route path="/" element={<ComingSoon />} />
        <Route path="/full" element={<FullSite />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/success" element={<SuccessPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
