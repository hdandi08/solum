import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import posthog from 'posthog-js';
import {
  buildAndroidIntentUrl,
  buildBreakoutUrl,
  detectPlatform,
  IAB_CHECKOUT_EVENTS,
  isInAppBrowser,
} from '../lib/inAppBrowser.js';
import { capture, getMetaIds, getTikTokIds } from '../lib/analytics.js';
import { captureAwinAttribution } from '../lib/awinAttribution.js';
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

  useLayoutEffect(() => {
    if (!active || hidden || variant === 'inline') return undefined;
    const element = barRef.current;
    const root = document.documentElement;
    if (!element) return undefined;
    const apply = () => root.style.setProperty('--iab-h', `${element.offsetHeight}px`);
    apply();
    root.classList.add('iab-on');
    const observer = new ResizeObserver(apply);
    observer.observe(element);
    return () => {
      observer.disconnect();
      root.classList.remove('iab-on');
      root.style.removeProperty('--iab-h');
    };
  }, [active, hidden, variant]);

  useEffect(() => {
    if (!active || hidden) return;
    try {
      if (sessionStorage.getItem(SHOWN_KEY) === '1') return;
      sessionStorage.setItem(SHOWN_KEY, '1');
    } catch { /* unavailable */ }
    capture(IAB_CHECKOUT_EVENTS.bannerShown, { platform, placement: variant });
  }, [active, hidden, platform, variant]);

  if (!active || hidden) return null;

  const wallet = platform === 'ios' ? 'Apple Pay' : 'Google Pay';

  function onOpen() {
    capture(IAB_CHECKOUT_EVENTS.bannerClicked, { platform, placement: variant });
    const distinctId = posthog.__loaded ? posthog.get_distinct_id() : undefined;
    const breakoutUrl = buildBreakoutUrl(distinctId, undefined, {
      awin: captureAwinAttribution(),
      meta: getMetaIds(),
      tiktok: getTikTokIds(),
    });
    if (platform === 'android') {
      window.location.href = buildAndroidIntentUrl(breakoutUrl);
      return;
    }
    window.history.replaceState({}, '', breakoutUrl);
    setShowOverlay(true);
  }

  function onDismiss(event) {
    event.stopPropagation();
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* unavailable */ }
    capture(IAB_CHECKOUT_EVENTS.bannerDismissed, { platform });
    setHidden(true);
  }

  const overlay = showOverlay && (
    <div className="iab-overlay" role="dialog" aria-modal="true" onClick={() => setShowOverlay(false)}>
      <div className="iab-overlay-card" onClick={(event) => event.stopPropagation()}>
        <div className="iab-overlay-title">Open in Safari for 1 tap Apple Pay</div>
        <ol className="iab-overlay-steps">
          <li>Tap the <strong>···</strong> menu (or <strong>aA</strong>) at the top of the screen.</li>
          <li>Choose <strong>“Open in Safari”</strong> or <strong>“Open in browser”</strong>.</li>
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
            <span className="iab-banner-arrow" aria-hidden="true">↗</span>
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
          <span className="iab-banner-text">Faster checkout. Open in your browser for 1 tap {wallet}</span>
          <span className="iab-banner-arrow" aria-hidden="true">↗</span>
        </button>
        <button type="button" className="iab-banner-close" aria-label="Dismiss" onClick={onDismiss}>×</button>
      </div>
      {overlay}
    </>
  );
}
