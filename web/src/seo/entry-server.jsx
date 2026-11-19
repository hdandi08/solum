import { renderToString } from 'react-dom/server';
import { StaticRouter, Routes, Route } from 'react-router-dom';
import FullSite from '../pages/FullSite.jsx';
import GiftPage from '../pages/GiftPage.jsx';
import BuyPage from '../pages/BuyPage.jsx';
import RitualPage from '../pages/RitualPage.jsx';
import GuidePage from '../pages/GuidePage.jsx';
import GuideArticle from '../pages/GuideArticle.jsx';
import ProductPage from '../pages/ProductPage.jsx';
import ContactPage from '../pages/ContactPage.jsx';
import TermsPage from '../pages/TermsPage.jsx';
import PrivacyPage from '../pages/PrivacyPage.jsx';
import AwardsPage from '../pages/AwardsPage.jsx';
import OfferBar from '../components/OfferBar.jsx';

// Actual page components, rendered without effects, network requests or user state.
// React mounts the same interactive site once the client bundle is available.
export function renderPublicPage(pathname) {
  return renderToString(
    <StaticRouter location={pathname}>
      <OfferBar />
      <Routes>
        <Route path="/" element={<FullSite />} />
        <Route path="/gift" element={<GiftPage />} />
        <Route path="/buy" element={<>
          <noscript><p>Enable JavaScript to use the secure checkout. You can still explore SOLUM kits and products.</p></noscript>
          <fieldset disabled style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}><BuyPage /></fieldset>
        </>} />
        <Route path="/ritual" element={<RitualPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/guide/:slug" element={<GuideArticle />} />
        <Route path="/product/:slug" element={<ProductPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/awards" element={<AwardsPage />} />
      </Routes>
    </StaticRouter>,
  );
}
