import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { initQualifiedVisitTracker } from './lib/qualifiedVisitTracker';
import { capture } from './lib/analytics';
import OfferBar from './components/OfferBar.jsx';
import FullSite from './pages/FullSite';
import './styles/global.css';

// Ad traffic lands on / — keep FullSite eager so the homepage paints from the
// main bundle. Everything else (incl. Stripe via BuyPage/CheckoutPage) loads
// only when its route is visited.
const CheckoutPage = lazy(() => import('./pages/checkout/CheckoutPage'));
const SuccessPage = lazy(() => import('./pages/SuccessPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const ConfirmPage = lazy(() => import('./pages/ConfirmPage'));
const RitualPage = lazy(() => import('./pages/RitualPage'));
const GuidePage = lazy(() => import('./pages/GuidePage'));
const GuideArticle = lazy(() => import('./pages/GuideArticle'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const CreatorsApplyPage = lazy(() => import('./pages/CreatorsApplyPage'));
const BuyPage = lazy(() => import('./pages/BuyPage'));
const EmailPreviewPage = lazy(() => import('./pages/EmailPreviewPage'));
const ProductPage = lazy(() => import('./pages/ProductPage.jsx'));

// Auth pages that handle their own session callbacks — do not redirect these.
const AUTH_DESTINATIONS = ['/account'];

// Shown while a lazy route chunk downloads. Direct ad landings on /buy used
// to sit on a blank screen here (fallback was null) — now they see the brand.
function RouteFallback() {
  return (
    <div style={{ minHeight: '100vh', background: '#08090b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img src="/solum-wordmark-clean.svg" alt="SOLUM" style={{ height: 22, opacity: 0.65 }} />
    </div>
  );
}

// Old kit URLs (/kit/ground, /kit/ritual) still live in past ad destinations and
// bio links; they hit the * catch-all and soft-404. Redirect them to /buy,
// keeping any attribution params (utm_*, fbclid) the old link carried.
function KitRedirect() {
  const { kitId } = useParams();
  if (!['ground', 'ritual'].includes(kitId)) return <NotFoundPage />;
  const search = new URLSearchParams(window.location.search);
  search.set('kit', kitId);
  return <Navigate to={{ pathname: '/buy', search: `?${search.toString()}` }} replace />;
}

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

export default function App() {
  useEffect(() => { initQualifiedVisitTracker(); }, []);

  // Canonical buy-intent event: record EVERY click that sends the visitor to
  // /buy, site-wide, via delegation — covers <a href="/buy..."> links and any
  // element marked data-buy-cta (buttons that navigate() programmatically).
  // New CTAs are tracked automatically; nothing needs per-component wiring.
  useEffect(() => {
    const onClick = (e) => {
      const el = e.target.closest?.('a[href^="/buy"], [data-buy-cta]');
      if (!el) return;
      const href = el.getAttribute('href') || el.dataset.buyCta || '/buy';
      let kit = null;
      try { kit = new URLSearchParams(href.split('?')[1] || '').get('kit'); } catch { /* no-op */ }
      const section = el.closest('section[id], [data-track]');
      capture('buy_cta_clicked', {
        placement: section?.dataset?.track || section?.id || 'page',
        page: window.location.pathname,
        kit,
        href,
        cta_text: (el.innerText || '').trim().slice(0, 60),
      });
    };
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);
  return (
    <BrowserRouter>
      <OfferBar />
      <AuthRedirectGuard />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<FullSite />} />
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
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/confirm" element={<ConfirmPage />} />
          <Route path="/creators" element={<CreatorsApplyPage />} />
          <Route path="/email-preview" element={<EmailPreviewPage />} />
          <Route path="/product/:slug" element={<ProductPage />} />
          <Route path="/kit/:kitId" element={<KitRedirect />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
