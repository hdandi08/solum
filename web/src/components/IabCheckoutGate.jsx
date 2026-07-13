import { useState, useEffect } from 'react';
import posthog from 'posthog-js';
import { detectInAppBrowser, detectPlatform, buildBreakoutUrl, buildAndroidIntentUrl } from '../lib/inAppBrowser.js';
import { capture } from '../lib/analytics.js';
// Overlay (.iab-overlay*) styles live in the banner's stylesheet — import it
// directly so the gate never depends on InAppBrowserBanner staying on /buy.
import './InAppBrowserBanner.css';
import './IabCheckoutGate.css';

const SHOWN_KEY = 'solum_iab_gate_shown';

const APP_NAMES = {
  instagram: 'the Instagram app',
  facebook:  'the Facebook app',
  tiktok:    'the TikTok app',
  snapchat:  'the Snapchat app',
  twitter:   'the X app',
  android_webview: 'this app',
  none: 'this app', // forceIab preview in a real browser
};

// Blocking choice card shown in place of the express wallets + details form
// when the visitor is inside a social in-app webview. Apple Pay, Google Pay
// and PayPal never render there (Link does), so the card offers the breakout
// first and keeps the card form one tap away.
export default function IabCheckoutGate({ kit, source, onContinue }) {
  const app      = detectInAppBrowser();
  const platform = detectPlatform();
  const [showOverlay, setShowOverlay] = useState(false);

  const wallets = platform === 'android'
    ? 'Google Pay, Apple Pay or PayPal'
    : 'Apple Pay, Google Pay or PayPal';

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SHOWN_KEY) === '1') return;
      sessionStorage.setItem(SHOWN_KEY, '1');
    } catch { /* no-op */ }
    capture('iab_gate_shown', { platform, app, kit, source });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onOpen() {
    capture('iab_gate_open_clicked', { platform, app, kit, source });
    const distinctId = posthog.__loaded ? posthog.get_distinct_id() : undefined;
    if (platform === 'android') {
      window.location.href = buildAndroidIntentUrl(buildBreakoutUrl(distinctId));
    } else {
      if (distinctId) window.history.replaceState({}, '', buildBreakoutUrl(distinctId));
      setShowOverlay(true);
    }
  }

  function onStay() {
    capture('iab_gate_continue_clicked', { platform, app, kit, source });
    onContinue();
  }

  return (
    <div className="iabg-card">
      <div className="iabg-title">Pay with {wallets}</div>
      <p className="iabg-body">
        One tap payment only works in your full browser, not inside {APP_NAMES[app] ?? 'this app'}.
        Your kit and details carry over.
      </p>
      <button type="button" className="iabg-open" onClick={onOpen}>
        Open in browser <span aria-hidden="true">&#8599;</span>
      </button>
      <button type="button" className="iabg-stay" onClick={onStay}>
        or continue here and pay by card
      </button>

      {showOverlay && (
        <div className="iab-overlay" role="dialog" aria-modal="true" onClick={() => setShowOverlay(false)}>
          <div className="iab-overlay-card" onClick={(e) => e.stopPropagation()}>
            <div className="iab-overlay-title">Open in Safari for 1 tap Apple Pay</div>
            <ol className="iab-overlay-steps">
              <li>Tap the <strong>···</strong> menu (or <strong>aA</strong>) at the top of the screen.</li>
              <li>Choose <strong>&ldquo;Open in Safari&rdquo;</strong> or <strong>&ldquo;Open in browser&rdquo;</strong>.</li>
            </ol>
            <button type="button" className="iab-overlay-btn" onClick={() => setShowOverlay(false)}>Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}
