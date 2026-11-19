import { routeLoaders } from './lib/routeLoaders.js';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { initQualifiedVisitTracker } from './lib/qualifiedVisitTracker';
import { capture, getTikTokIds } from './lib/analytics';
import { captureAwinAttribution } from './lib/awinAttribution';
import { captureLandingAwc } from './lib/awinCookieBridge';
import { ensureAwinMasterTag, mustReloadWithoutAwin, shouldLoadAwinMasterTag } from './lib/awinMasterTag';
import OfferBar from './components/OfferBar.jsx';
import RouteMetadata from './seo/RouteMetadata.jsx';
import './styles/global.css';

// Keep each landing route independent: checkout must not download the homepage.
const loadHomePage = routeLoaders.home;
const loadBuyPage = routeLoaders.buy;
const FullSite = lazy(loadHomePage);
// Begin route and Stripe downloads together, before React renders the route.
if (window.location.pathname === '/buy') {
  void loadBuyPage().catch(() => {});
  void import('./lib/stripe.js').catch(() => {});
} else if (['/', '/full'].includes(window.location.pathname)) {
  void loadHomePage().catch(() => {});
}
const CheckoutPage = lazy(routeLoaders.checkout);
const SuccessPage = lazy(routeLoaders.success);
const AccountPage = lazy(routeLoaders.account);
const NotFoundPage = lazy(routeLoaders.notFound);
const ConfirmPage = lazy(routeLoaders.confirm);
const RitualPage = lazy(routeLoaders.ritual);
const GuidePage = lazy(routeLoaders.guide);
const GuideArticle = lazy(routeLoaders.guideArticle);
const TermsPage = lazy(routeLoaders.terms);
const ContactPage = lazy(routeLoaders.contact);
const PrivacyPage = lazy(routeLoaders.privacy);
const CreatorsApplyPage = lazy(routeLoaders.creators);
const BuyPage = lazy(loadBuyPage);
const GiftPage = lazy(routeLoaders.gift);
const EmailPreviewPage = lazy(routeLoaders.emailPreview);
const ProductPage = lazy(routeLoaders.product);
const AwardsPage = lazy(routeLoaders.awards);

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

function AwinMasterTagGate() {
  const { pathname } = useLocation()

  useEffect(() => {
    if (mustReloadWithoutAwin({
      pathname,
      masterTagPresent: Boolean(document.getElementById('solum-awin-mastertag')),
    })) {
      window.location.replace(window.location.href)
      return
    }
    if (shouldLoadAwinMasterTag({
      hostname: window.location.hostname,
      pathname,
      webdriver: navigator.webdriver,
    })) ensureAwinMasterTag(document)
  }, [pathname])

  return null
}

export default function App() {
  useEffect(() => { initQualifiedVisitTracker(); }, []);

  // Capture affiliate/ad attribution (Awin awc, TikTok ttclid) on first landing,
  // on ANY page, so it survives internal navigation to /buy.
  useEffect(() => {
    captureLandingAwc(window.location.search);
    captureAwinAttribution();
    getTikTokIds();
  }, []);

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
      <RouteMetadata />
      <AwinMasterTagGate />
      <OfferBar />
      <AuthRedirectGuard />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<FullSite />} />
          <Route path="/full" element={<FullSite />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/buy" element={<BuyPage />} />
          <Route path="/gift" element={<GiftPage />} />
          <Route path="/awards" element={<AwardsPage />} />
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
