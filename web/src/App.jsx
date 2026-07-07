import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { initQualifiedVisitTracker } from './lib/qualifiedVisitTracker';
import OfferBar from './components/OfferBar.jsx';
import ComingSoon from './pages/ComingSoon';
import FullSite from './pages/FullSite';
import './styles/global.css';

// Ad traffic lands on / — keep FullSite/ComingSoon eager so the homepage paints
// from the main bundle. Everything else (incl. Stripe via BuyPage/CheckoutPage)
// loads only when its route is visited.
const CheckoutPage = lazy(() => import('./pages/checkout/CheckoutPage'));
const SuccessPage = lazy(() => import('./pages/SuccessPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const ConfirmPage = lazy(() => import('./pages/ConfirmPage'));
const RitualPage = lazy(() => import('./pages/RitualPage'));
const GuidePage = lazy(() => import('./pages/GuidePage'));
const GuideArticle = lazy(() => import('./pages/GuideArticle'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const CreatorsApplyPage = lazy(() => import('./pages/CreatorsApplyPage'));
const BuyPage = lazy(() => import('./pages/BuyPage'));
const EmailPreviewPage = lazy(() => import('./pages/EmailPreviewPage'));
const ProductPage = lazy(() => import('./pages/ProductPage.jsx'));

// Auth pages that handle their own session callbacks — do not redirect these.
const AUTH_DESTINATIONS = ['/account'];

// If Supabase drops auth tokens on the wrong page, forward to /account.
// AUTH_DESTINATIONS handle their own session callbacks and are excluded.
function AuthRedirectGuard() {
  useEffect(() => {
    const hash   = window.location.hash
    const params = new URLSearchParams(window.location.search)
    const isAuthCallback = hash.includes('access_token') || hash.includes('error_description') || params.has('code')
    if (isAuthCallback && !AUTH_DESTINATIONS.includes(window.location.pathname)) {
      window.location.replace('/account' + window.location.hash)
    }
  }, [])
  return null
}

const IS_LIVE = import.meta.env.VITE_LAUNCH_MODE === 'live';

export default function App() {
  useEffect(() => { initQualifiedVisitTracker(); }, []);
  return (
    <BrowserRouter>
      <OfferBar />
      <AuthRedirectGuard />
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={IS_LIVE ? <FullSite /> : <ComingSoon />} />
          <Route path="/full" element={<FullSite />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/buy" element={<BuyPage />} />
          <Route path="/success" element={<SuccessPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/ritual" element={<RitualPage />} />
          <Route path="/guide" element={<GuidePage />} />
          <Route path="/guide/:slug" element={<GuideArticle />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/confirm" element={<ConfirmPage />} />
          <Route path="/creators" element={<CreatorsApplyPage />} />
          <Route path="/email-preview" element={<EmailPreviewPage />} />
          <Route path="/product/:slug" element={<ProductPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
