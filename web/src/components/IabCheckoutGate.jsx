import { useEffect, useState } from 'react';
import posthog from 'posthog-js';
import {
  buildAndroidIntentUrl,
  buildBreakoutUrl,
  detectInAppBrowser,
  detectPlatform,
  formatIabCheckoutSummary,
  IAB_CHECKOUT_EVENTS,
} from '../lib/inAppBrowser.js';
import { capture, getMetaIds, getTikTokIds } from '../lib/analytics.js';
import { captureAwinAttribution } from '../lib/awinAttribution.js';
import './InAppBrowserBanner.css';
import './IabCheckoutGate.css';

const SHOWN_KEY = 'solum_iab_gate_shown';
const APP_NAMES = {
  instagram: 'the Instagram app',
  facebook: 'the Facebook app',
  tiktok: 'the TikTok app',
  snapchat: 'the Snapchat app',
  twitter: 'the X app',
  android_webview: 'this app',
  none: 'this app',
};

export default function IabCheckoutGate({ kit, kitName, price, source, onContinue, expressReady, expressAvailable, children }) {
  const app = detectInAppBrowser();
  const platform = detectPlatform();
  const [showOverlay, setShowOverlay] = useState(false);
  const summary = formatIabCheckoutSummary({ kitName, price, app });

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SHOWN_KEY) === '1') return;
      sessionStorage.setItem(SHOWN_KEY, '1');
    } catch { /* unavailable */ }
    capture(IAB_CHECKOUT_EVENTS.gateShown, { platform, app, kit, source });
  }, [app, kit, platform, source]);

  function onOpen() {
    capture(IAB_CHECKOUT_EVENTS.gateOpenClicked, { platform, app, kit, source });
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

  function onStay() {
    capture(IAB_CHECKOUT_EVENTS.gateContinueClicked, { platform, app, kit, source });
    onContinue();
  }

  return (
    <div className="iabg-card">
      <div className="iabg-selection">{summary.selection}</div>
      <div className="iabg-delivery">{summary.delivery}</div>
      <div className="iabg-title">Choose how you pay</div>
      <p className="iabg-body">
        {summary.support}
      </p>
      <div className="iabg-express" aria-label="Available quick-pay options">
        {children}
      </div>
      {expressReady && !expressAvailable && (
        <p className="iabg-unavailable">No quick-pay option was detected in {APP_NAMES[app] ?? 'this app'}.</p>
      )}
      <button type="button" className="iabg-open" onClick={onOpen}>
        Open in browser for more payment options <span aria-hidden="true">↗</span>
      </button>
      <button type="button" className="iabg-stay" onClick={onStay}>
        {summary.continueLabel} and pay by card
      </button>

      {showOverlay && (
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
      )}
    </div>
  );
}
