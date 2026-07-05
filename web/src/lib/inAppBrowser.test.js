import { describe, it, expect } from 'vitest';
import { detectInAppBrowser } from './inAppBrowser';

// Representative real-world user-agent strings for the in-app webviews we care about.
const UA = {
  instagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 335.0.0.0.0 (iPhone14,3; iOS 17_5; en_GB)',
  facebook:  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/470.0.0.0]',
  messenger: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FB_IAB/MESSENGER;FBAV/470.0.0.0]',
  tiktok:    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_35.0.0 BytedanceWebview/d8a21c',
  snapchat:  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Snapchat/12.0.0.0',
  androidWv: 'Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ3A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36',
  safari:    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  chrome:    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
};

describe('detectInAppBrowser', () => {
  it('detects Instagram', () => expect(detectInAppBrowser(UA.instagram)).toBe('instagram'));
  it('detects Facebook (FBAN/FBAV)', () => expect(detectInAppBrowser(UA.facebook)).toBe('facebook'));
  it('detects Messenger (FB_IAB)', () => expect(detectInAppBrowser(UA.messenger)).toBe('facebook'));
  it('detects TikTok', () => expect(detectInAppBrowser(UA.tiktok)).toBe('tiktok'));
  it('detects Snapchat', () => expect(detectInAppBrowser(UA.snapchat)).toBe('snapchat'));
  it('detects a generic Android WebView', () => expect(detectInAppBrowser(UA.androidWv)).toBe('android_webview'));

  it('returns none for real Safari', () => expect(detectInAppBrowser(UA.safari)).toBe('none'));
  it('returns none for real Chrome', () => expect(detectInAppBrowser(UA.chrome)).toBe('none'));
  it('returns none for empty / missing UA', () => {
    expect(detectInAppBrowser('')).toBe('none');
    expect(detectInAppBrowser(undefined)).toBe('none');
  });

  it('prefers the more specific app over generic android webview (TikTok on Android)', () => {
    const tiktokAndroid = 'Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ3A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 BytedanceWebview/d8a21c';
    expect(detectInAppBrowser(tiktokAndroid)).toBe('tiktok');
  });
});
