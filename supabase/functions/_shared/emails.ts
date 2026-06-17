// supabase/functions/_shared/emails.ts

const FROM = 'SOLUM <no-reply@orders.bysolum.co.uk>';
const LOGO = 'https://bysolum.co.uk/solum-wordmark-email.png';

function base(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#111111;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#111111;padding:0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- Header -->
  <tr><td style="background:#08090B;padding:32px 48px 26px;border-bottom:1px solid #181c24;">
    <img src="${LOGO}" alt="SOLUM" width="130" style="display:block;height:auto;border:0;" />
    <p style="margin:10px 0 0;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#4A8FC7;font-weight:600;">Your body. Done right.</p>
  </td></tr>

  ${content}

  <!-- Footer -->
  <tr><td style="background:#08090B;border-top:1px solid #1e2530;padding:28px 48px 36px;">
    <p style="margin:0 0 6px;font-size:12px;color:rgba(240,236,226,0.35);line-height:1.7;">
      Questions? Reply to this email or write to <a href="mailto:contact@bysolum.com" style="color:#4A8FC7;text-decoration:none;">contact@bysolum.com</a>
    </p>
    <p style="margin:0;font-size:11px;color:rgba(240,236,226,0.2);letter-spacing:1px;">SOLUM &nbsp;·&nbsp; bysolum.co.uk &nbsp;·&nbsp; Your body. Done right.</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

async function send(resendKey: string, to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Resend ${res.status}: ${body}` };
    }
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── 1. Dispatched ────────────────────────────────────────────────────────────

export async function sendDispatchEmail(
  resendKey: string,
  to: string,
  firstName: string | null,
  trackingNumber: string | null,
  trackingUrl: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const greeting = firstName ?? 'there';
  const trackingBlock = trackingNumber
    ? `<tr><td style="background:#08090B;padding:0 48px 40px;">
        <a href="${trackingUrl ?? '#'}" style="display:block;background:#181C24;border:1px solid #1e2530;padding:20px 28px;text-decoration:none;">
          <p style="margin:0 0 4px;font-size:9px;letter-spacing:4px;text-transform:uppercase;color:#4A8FC7;font-weight:700;">Tracking Number</p>
          <p style="margin:0;font-size:18px;font-weight:700;color:#F0ECE2;letter-spacing:0.08em;font-family:monospace;">${trackingNumber}</p>
          ${trackingUrl ? `<p style="margin:6px 0 0;font-size:12px;color:rgba(240,236,226,0.45);">Click to track your parcel →</p>` : ''}
        </a>
      </td></tr>`
    : '';

  const html = base(`
  <tr><td style="background:#08090B;padding:48px 48px 32px;">
    <h1 style="margin:0 0 16px;font-size:44px;font-weight:700;letter-spacing:0.04em;color:#F0ECE2;text-transform:uppercase;line-height:0.95;">
      Your Order<br />Is On Its Way.
    </h1>
    <div style="width:48px;height:1px;background:#2E6DA4;margin-bottom:24px;"></div>
    <p style="margin:0 0 32px;font-size:15px;color:rgba(240,236,226,0.7);line-height:1.75;max-width:440px;">
      Hey ${greeting} — your SOLUM kit has been packed and handed to the courier. Expect it in 2–3 working days.
    </p>
  </td></tr>
  ${trackingBlock}
  <tr><td style="background:#08090B;padding:0 48px 48px;">
    <p style="margin:0;font-size:13px;color:rgba(240,236,226,0.45);line-height:1.7;">
      If anything looks wrong with your delivery, reply to this email and we'll sort it.
    </p>
  </td></tr>`);

  return send(resendKey, to, 'Your SOLUM kit is on its way', html);
}

// ── 2. Delivered ─────────────────────────────────────────────────────────────

export async function sendDeliveredEmail(
  resendKey: string,
  to: string,
  firstName: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const greeting = firstName ?? 'there';

  const html = base(`
  <tr><td style="background:#08090B;padding:48px 48px 32px;">
    <h1 style="margin:0 0 16px;font-size:44px;font-weight:700;letter-spacing:0.04em;color:#F0ECE2;text-transform:uppercase;line-height:0.95;">
      Delivered.
    </h1>
    <div style="width:48px;height:1px;background:#2E6DA4;margin-bottom:24px;"></div>
    <p style="margin:0 0 32px;font-size:15px;color:rgba(240,236,226,0.7);line-height:1.75;max-width:440px;">
      Hey ${greeting} — your SOLUM kit has been delivered. Time to start the ritual.
    </p>
  </td></tr>
  <tr><td style="background:#08090B;padding:0 48px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#181C24;border:1px solid #1e2530;border-left:2px solid #2E6DA4;">
      <tr><td style="padding:24px 28px;">
        <p style="margin:0 0 4px;font-size:9px;letter-spacing:4px;text-transform:uppercase;color:#4A8FC7;font-weight:700;">Start Here</p>
        <p style="margin:12px 0 0;font-size:15px;color:rgba(240,236,226,0.85);line-height:1.75;">
          Your ritual card is in the box — it walks you through every product in the right order. Daily ritual: 10 minutes. Weekly deep ritual: 22 minutes.
        </p>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="background:#08090B;padding:0 48px 48px;">
    <p style="margin:0;font-size:13px;color:rgba(240,236,226,0.45);line-height:1.7;">
      If your parcel arrived damaged or anything is missing, reply to this email within 48 hours and we'll make it right.
    </p>
  </td></tr>`);

  return send(resendKey, to, 'Your SOLUM kit has been delivered', html);
}

// ── 3. Delivery failed / lost / returned ─────────────────────────────────────

export async function sendFailedDeliveryEmail(
  resendKey: string,
  to: string,
  firstName: string | null,
  statusMessage: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const greeting = firstName ?? 'there';
  const detail = statusMessage
    ? `<p style="margin:12px 0 0;font-size:13px;color:rgba(240,236,226,0.45);line-height:1.7;">Carrier update: ${statusMessage}</p>`
    : '';

  const html = base(`
  <tr><td style="background:#08090B;padding:48px 48px 0;">
    <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr><td style="background:rgba(224,92,92,0.1);border:1px solid rgba(224,92,92,0.35);padding:5px 14px;">
        <p style="margin:0;font-size:9px;letter-spacing:4px;text-transform:uppercase;color:#e05c5c;font-weight:700;">Delivery Issue</p>
      </td></tr>
    </table>
    <h1 style="margin:0 0 16px;font-size:44px;font-weight:700;letter-spacing:0.04em;color:#F0ECE2;text-transform:uppercase;line-height:0.95;">
      There's A<br />Problem With<br />Your Delivery.
    </h1>
    <div style="width:48px;height:1px;background:#2E6DA4;margin-bottom:24px;"></div>
    <p style="margin:0 0 32px;font-size:15px;color:rgba(240,236,226,0.7);line-height:1.75;max-width:440px;">
      Hey ${greeting} — we've been notified that there's an issue with your delivery. Reply to this email and we'll investigate and resolve it as quickly as possible.
    </p>
  </td></tr>
  <tr><td style="background:#08090B;padding:0 48px 48px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#181C24;border:1px solid rgba(224,92,92,0.2);border-left:2px solid #e05c5c;">
      <tr><td style="padding:24px 28px;">
        <p style="margin:0;font-size:14px;font-weight:600;color:#F0ECE2;">What happens next</p>
        <p style="margin:8px 0 0;font-size:13px;color:rgba(240,236,226,0.6);line-height:1.75;">
          Reply to this email and include your order reference. We'll chase the courier and either reship or refund — whichever you prefer.
        </p>
        ${detail}
      </td></tr>
    </table>
  </td></tr>`);

  return send(resendKey, to, "There's a problem with your SOLUM delivery", html);
}

// ── 4. Cancelled & refunded ───────────────────────────────────────────────────

export async function sendCancelEmail(
  resendKey: string,
  to: string,
  firstName: string | null,
  refundId: string,
  amountPence: number,
): Promise<{ ok: boolean; error?: string }> {
  const greeting = firstName ?? 'there';
  const amount = `£${(amountPence / 100).toFixed(2)}`;

  const html = base(`
  <tr><td style="background:#08090B;padding:48px 48px 0;">
    <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr><td style="background:rgba(224,92,92,0.1);border:1px solid rgba(224,92,92,0.35);padding:5px 14px;">
        <p style="margin:0;font-size:9px;letter-spacing:4px;text-transform:uppercase;color:#e05c5c;font-weight:700;">Order Cancelled</p>
      </td></tr>
    </table>
    <h1 style="margin:0 0 16px;font-size:44px;font-weight:700;letter-spacing:0.04em;color:#F0ECE2;text-transform:uppercase;line-height:0.95;">
      Your Order<br />Has Been<br />Cancelled.
    </h1>
    <div style="width:48px;height:1px;background:#2E6DA4;margin-bottom:24px;"></div>
    <p style="margin:0 0 32px;font-size:15px;color:rgba(240,236,226,0.7);line-height:1.75;max-width:440px;">
      Hey ${greeting} — your order has been cancelled and a full refund of ${amount} has been issued to your original payment method.
    </p>
  </td></tr>
  <tr><td style="background:#08090B;padding:0 48px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#181C24;border:1px solid #1e2530;">
      <tr><td style="padding:20px 28px;border-bottom:1px solid #1e2530;">
        <p style="margin:0 0 4px;font-size:9px;letter-spacing:4px;text-transform:uppercase;color:#4A8FC7;font-weight:700;">Refund Amount</p>
        <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#F0ECE2;letter-spacing:0.04em;">${amount}</p>
      </td></tr>
      <tr><td style="padding:20px 28px;border-bottom:1px solid #1e2530;">
        <p style="margin:0 0 4px;font-size:9px;letter-spacing:4px;text-transform:uppercase;color:#4A8FC7;font-weight:700;">Refund Reference</p>
        <p style="margin:6px 0 0;font-size:13px;color:rgba(240,236,226,0.55);font-family:monospace;">${refundId}</p>
      </td></tr>
      <tr><td style="padding:20px 28px;">
        <p style="margin:0 0 4px;font-size:9px;letter-spacing:4px;text-transform:uppercase;color:#4A8FC7;font-weight:700;">Timeline</p>
        <p style="margin:6px 0 0;font-size:13px;color:rgba(240,236,226,0.55);line-height:1.6;">Refunds typically appear within 3–5 business days depending on your bank.</p>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="background:#08090B;padding:0 48px 48px;">
    <p style="margin:0;font-size:13px;color:rgba(240,236,226,0.45);line-height:1.7;">
      If you have any questions about your refund, reply to this email with your refund reference above.
    </p>
  </td></tr>`);

  return send(resendKey, to, `Your SOLUM order has been cancelled — ${amount} refunded`, html);
}
