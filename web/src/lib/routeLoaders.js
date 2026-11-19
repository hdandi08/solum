// Share initial-page preloading and React.lazy's loader to keep useful static
// HTML on screen while its interactive route chunk downloads.
export const routeLoaders = {
  home: () => import('../pages/FullSite.jsx'),
  buy: () => import('../pages/BuyPage.jsx'),
  gift: () => import('../pages/GiftPage.jsx'),
  checkout: () => import('../pages/checkout/CheckoutPage.jsx'),
  success: () => import('../pages/SuccessPage.jsx'),
  account: () => import('../pages/AccountPage.jsx'),
  confirm: () => import('../pages/ConfirmPage.jsx'),
  ritual: () => import('../pages/RitualPage.jsx'),
  guide: () => import('../pages/GuidePage.jsx'),
  guideArticle: () => import('../pages/GuideArticle.jsx'),
  terms: () => import('../pages/TermsPage.jsx'),
  privacy: () => import('../pages/PrivacyPage.jsx'),
  contact: () => import('../pages/ContactPage.jsx'),
  awards: () => import('../pages/AwardsPage.jsx'),
  creators: () => import('../pages/CreatorsApplyPage.jsx'),
  emailPreview: () => import('../pages/EmailPreviewPage.jsx'),
  product: () => import('../pages/ProductPage.jsx'),
  notFound: () => import('../pages/NotFoundPage.jsx'),
};
export function initialRouteLoader(pathname) {
  pathname = pathname.replace(/\/+$/, '') || '/';
  if (pathname === '/' || pathname === '/full') return routeLoaders.home;
  if (pathname.startsWith('/guide/')) return routeLoaders.guideArticle;
  if (pathname.startsWith('/product/')) return routeLoaders.product;
  return routeLoaders[pathname.replace(/^\//, '').replace(/\/$/, '')] || routeLoaders.notFound;
}
