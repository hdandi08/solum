/**
 * Dev-only email preview page.
 * Navigate to /email-preview to see what the confirmation email looks like.
 * Toggle between one-time and subscription variants.
 *
 * Not linked from nav — only accessible directly via URL.
 */

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const KIT_NAMES = { ground: 'GROUND', ritual: 'RITUAL' };

function buildEmailHtml(kitId, firstName, orderRef, isOneTime) {
  const kitName = KIT_NAMES[kitId] ?? kitId.toUpperCase();

  const step3 = isOneTime
    ? `<tr><td style="padding:16px 20px;border-bottom:1px solid #e0ddd6;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td width="32" style="font-size:22px;font-weight:700;color:#2E6DA4;vertical-align:top;padding-top:2px;">3</td>
          <td>
            <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#08090B;">We'll check in at two weeks</p>
            <p style="margin:0;font-size:13px;color:#777;line-height:1.5;">Once you've had time to use the kit properly, we'll ask a few quick questions. Your feedback directly shapes what we build next.</p>
          </td>
        </tr></table>
      </td></tr>`
    : `<tr><td style="padding:16px 20px;border-bottom:1px solid #e0ddd6;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td width="32" style="font-size:22px;font-weight:700;color:#2E6DA4;vertical-align:top;padding-top:2px;">3</td>
          <td>
            <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#08090B;">Refills every 30 days</p>
            <p style="margin:0;font-size:13px;color:#777;line-height:1.5;">Your first refill is charged 30 days from today — you saw the exact date at checkout. Every 30 days after that. You'll never run out.</p>
          </td>
        </tr></table>
      </td></tr>`;

  const footerLine = isOneTime
    ? `<p style="margin:0;font-size:12px;color:#555;">SOLUM · bysolum.co.uk</p>`
    : `<p style="margin:0;font-size:12px;color:#555;">SOLUM · bysolum.co.uk · You can cancel any time from your account.</p>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="background:#08090B;padding:40px 48px;">
          <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:28px;font-weight:700;letter-spacing:0.15em;color:#F0ECE2;text-transform:uppercase;">SOLUM</p>
          <p style="margin:8px 0 0;font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#4A8FC7;">Your body. Done right.</p>
        </td></tr>
        <tr><td style="background:#ffffff;padding:48px 48px 32px;">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#4A8FC7;font-weight:600;">Order Confirmed</p>
          <h1 style="margin:0 0 24px;font-size:36px;font-weight:700;letter-spacing:0.04em;color:#08090B;text-transform:uppercase;line-height:1;">Ritual Begins,<br>${firstName}.</h1>
          <p style="margin:0 0 32px;font-size:15px;color:#555;line-height:1.7;">Your ${kitName} Kit is confirmed. Here's everything you need to know.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;border:1px solid #e0ddd6;margin-bottom:40px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 6px;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#888;font-weight:600;">Order Reference</p>
              <p style="margin:0 0 4px;font-size:28px;font-weight:700;letter-spacing:0.1em;color:#08090B;">#${orderRef}</p>
              <p style="margin:0;font-size:12px;color:#888;">Keep this for your records</p>
            </td></tr>
          </table>
          <p style="margin:0 0 20px;font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#4A8FC7;font-weight:600;">What Happens Next</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0ddd6;">
            <tr><td style="padding:16px 20px;border-bottom:1px solid #e0ddd6;">
              <table width="100%" cellpadding="0" cellspacing="0"><tr>
                <td width="32" style="font-size:22px;font-weight:700;color:#2E6DA4;vertical-align:top;padding-top:2px;">1</td>
                <td><p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#08090B;">Confirmation email</p><p style="margin:0;font-size:13px;color:#777;line-height:1.5;">That's this one. You're all set.</p></td>
              </tr></table>
            </td></tr>
            <tr><td style="padding:16px 20px;border-bottom:1px solid #e0ddd6;">
              <table width="100%" cellpadding="0" cellspacing="0"><tr>
                <td width="32" style="font-size:22px;font-weight:700;color:#2E6DA4;vertical-align:top;padding-top:2px;">2</td>
                <td><p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#08090B;">Kit ships Thursday or Monday</p><p style="margin:0;font-size:13px;color:#777;line-height:1.5;">Your full ${kitName} Kit — tools and consumables. Dispatched on the next available slot and arrives within 2 days. You'll get a tracking email when it's on its way.</p></td>
              </tr></table>
            </td></tr>
            ${step3}
            <tr><td style="padding:16px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0"><tr>
                <td width="32" style="font-size:22px;font-weight:700;color:#2E6DA4;vertical-align:top;padding-top:2px;">4</td>
                <td><p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#08090B;">Ritual card is in the box</p><p style="margin:0;font-size:13px;color:#777;line-height:1.5;">Step-by-step instructions for your daily and weekly ritual. Everything in the right order.</p></td>
              </tr></table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="background:#08090B;padding:32px 48px;">
          <p style="margin:0 0 8px;font-size:13px;color:#888;line-height:1.6;">Questions? Reply to this email or contact us at <a href="mailto:contact@bysolum.com" style="color:#4A8FC7;text-decoration:none;">contact@bysolum.com</a></p>
          ${footerLine}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export default function EmailPreviewPage() {
  const [params] = useSearchParams();
  const [isOneTime, setIsOneTime] = useState(params.get('type') !== 'subscription');
  const [kit, setKit]             = useState(params.get('kit') ?? 'ritual');

  const html = buildEmailHtml(kit, 'James', 'ABCDEF12', isOneTime);

  return (
    <div style={{ fontFamily: 'monospace', background: '#111', minHeight: '100vh' }}>

      {/* Controls */}
      <div style={{
        background: '#1a1a2e', borderBottom: '1px solid #333', padding: '12px 24px',
        display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap',
      }}>
        <span style={{ color: '#4A8FC7', fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 600 }}>
          Email Preview
        </span>
        <span style={{ color: '#555', fontSize: 12 }}>|</span>
        <label style={{ color: '#aaa', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
          <input type="checkbox" checked={isOneTime} onChange={e => setIsOneTime(e.target.checked)} />
          One-time (first_batch / gift / tiktok)
        </label>
        <label style={{ color: '#aaa', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
          Kit:
          <select value={kit} onChange={e => setKit(e.target.value)} style={{ background: '#222', color: '#aaa', border: '1px solid #444', padding: '2px 6px', fontSize: 13 }}>
            <option value="ground">GROUND</option>
            <option value="ritual">RITUAL</option>
          </select>
        </label>
        <span style={{ color: '#555', fontSize: 12, marginLeft: 'auto' }}>
          {isOneTime ? 'one-time copy (no subscription messaging)' : 'subscription copy'}
        </span>
      </div>

      {/* Email rendered in iframe — exact in-browser representation */}
      <iframe
        srcDoc={html}
        style={{ width: '100%', height: 'calc(100vh - 53px)', border: 'none', background: '#f4f4f0' }}
        title="Email preview"
      />
    </div>
  );
}
