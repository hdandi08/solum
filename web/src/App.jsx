import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import ComingSoon from './pages/ComingSoon';
import FullSite from './pages/FullSite';
import CheckoutPage from './pages/CheckoutPage';
import SuccessPage from './pages/SuccessPage';
import AccountPage from './pages/AccountPage';
import NotFoundPage from './pages/NotFoundPage';
import ConfirmPage from './pages/ConfirmPage';
import RitualPage from './pages/RitualPage';
import GuidePage from './pages/GuidePage';
import GuideArticle from './pages/GuideArticle';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import Founding100Page from './pages/Founding100Page';
import AthletePage from './pages/AthletePage';
import AthleteComingSoon from './pages/AthleteComingSoon';
import './styles/global.css';

// Auth pages that handle their own session callbacks — do not redirect these.
const AUTH_DESTINATIONS = ['/account', '/founding-100'];

// If Supabase drops auth tokens on the wrong page (e.g. site root instead of /account),
// pick them up and forward to the right destination so the session can be established.
// founding=1 query param means the link came from the founding-100 portal email.
function AuthRedirectGuard() {
  useEffect(() => {
    const hash   = window.location.hash
    const params = new URLSearchParams(window.location.search)
    const isAuthCallback = hash.includes('access_token') || hash.includes('error_description') || params.has('code')
    if (isAuthCallback && !AUTH_DESTINATIONS.includes(window.location.pathname)) {
      const dest = params.has('founding') ? '/founding-100' : '/account'
      window.location.replace(dest + window.location.hash)
    }
  }, [])
  return null
}

const IS_LIVE = import.meta.env.VITE_LAUNCH_MODE === 'live';

export default function App() {
  return (
    <BrowserRouter>
      <AuthRedirectGuard />
      <Routes>
        <Route path="/" element={IS_LIVE ? <FullSite /> : <ComingSoon />} />
        <Route path="/full" element={<FullSite />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/success" element={<SuccessPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/ritual" element={<RitualPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/guide/:slug" element={<GuideArticle />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/confirm" element={<ConfirmPage />} />
        <Route path="/founding-100" element={<Founding100Page />} />
        <Route path="/athletes" element={IS_LIVE ? <AthletePage /> : <AthleteComingSoon />} />
        <Route path="/sports"   element={IS_LIVE ? <AthletePage /> : <AthleteComingSoon />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
