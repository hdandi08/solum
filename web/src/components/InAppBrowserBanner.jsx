import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import posthog from 'posthog-js';
import { isInAppBrowser, detectPlatform, buildBreakoutUrl, buildAndroidIntentUrl } from '../lib/inAppBrowser.js';
import { capture } from '../lib/analytics.js';
import './InAppBrowserBanner.css';

const DISMISS_KEY = 'solum_iab_banner_dismissed';
const SHOWN_KEY = 'solum_iab_banner_shown';

function wasDismissed() {
  try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
}

export default function InAppBrowserBanner({ variant = 'fixed' }) {
  const platform = detectPlatform();
  const active = isInAppBrowser() && (platform === 'ios' || platform === 'android');

  const [hidden, setHidden] = useState(() => wasDismissed());
  const [showOverlay, setShowOverlay] = useState(false);
  const barRef = useRef(null);

  // The banner is a fixed bar pinned above the fixed checkout nav. Publish its
  // measured height as --iab-h and flag <html> with .iab-on so checkout.css can
  // push the nav and page content down by exactly the banner height (the copy
  // wraps to two lines on narrow screens, so the height must be measured).
  useLayoutEffect(() => {
    if (!active || hidden || variant === 'inline') return undefined;
    const el = barRef.current;
    const root = document.documentElement;
    if (!el) return undefined;
    const apply = () => root.style.setProperty('--iab-h', `${el.offsetHeight}px`);
    apply();
    root.classList.add('iab-on');
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.classList.remove('iab-on');
      root.style.removeProperty('--iab-h');
    };
  }, [active, hidden, platform]);

  // Fire the "shown" event once per session when the banner is actually visible.
  useEffect(() => {
    if (!active || hidden) return;
    try {
      if (sessionStorage.getItem(SHOWN_KEY) === '1') return;
      sessionStorage.setItem(SHOWN_KEY, '1');
    } catch { /* no-op */ }
    capture('iab_banner_shown', { platform, placement: variant });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!active || hidden) return null;

  const distinctId = posthog.__loaded ? posthog.get_distinct_id() : undefined;
  const wallet = platform === 'ios' ? 'Apple Pay' : 'Google Pay';

  function onOpen() {
    capture('iab_banner_clicked', { platform, placement: variant });
    if (platform === 'android') {
      window.location.href = buildAndroidIntentUrl(buildBreakoutUrl(distinctId));
    } else {
      if (distinctId) window.history.replaceState({}, '', buildBreakoutUrl(distinctId));
      setShowOverlay(true);
    }
  }

  function onDismiss(e) {
    e.stopPropagation();
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* no-op */ }
    capture('iab_banner_dismissed', { platform });
    setHidden(true);
  }

  const overlay = showOverlay && (
    <div className="iab-overlay" role="dialog" aria-modal="true" onClick={() => setShowOverlay(false)}>
      <div className="iab-overlay-card" onClick={(e) => e.stopPropagation()}>
        <div className="iab-overlay-title">Open in Safari for 1 tap Apple Pay</div>
        <ol className="iab-overlay-steps">
          <li>Tap the menu (the dots or aA) at the top of the screen.</li>
          <li>Choose Open in Safari (or Open in Browser).</li>
        </ol>
        <button type="button" className="iab-overlay-btn" onClick={() => setShowOverlay(false)}>Got it</button>
      </div>
    </div>
  );

  if (variant === 'inline') {
    return (
      <>
        <div className="iab-inline">
          <button type="button" className="iab-inline-open" onClick={onOpen}>
            <span className="iab-banner-text">Prefer 1 tap {wallet}? Open in your browser</span>
            <span className="iab-banner-arrow" aria-hidden="true">&#8599;</span>
          </button>
        </div>
        {overlay}
      </>
    );
  }

  return (
    <>
      <div className="iab-banner" ref={barRef}>
        <button type="button" className="iab-banner-open" onClick={onOpen}>
          <span className="iab-banner-text">
            Faster checkout. Open in your browser for 1 tap {wallet}
          </span>
          <span className="iab-banner-arrow" aria-hidden="true">&#8599;</span>
        </button>
        <button type="button" className="iab-banner-close" aria-label="Dismiss" onClick={onDismiss}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {overlay}
    </>
  );
}
