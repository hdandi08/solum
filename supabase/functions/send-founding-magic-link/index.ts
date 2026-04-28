// supabase/functions/send-founding-magic-link/index.ts
// Public — validates invited/founding email, generates magic link, sends branded email via Resend.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SITE_URL = Deno.env.get('SITE_URL') || 'https://bysolum.co.uk';

function buildEmail(email: string, magicLink: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Your SOLUM Founding Portal login link</title>
</head>
<body style="margin:0;padding:0;background:#08090b;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#08090b;padding:48px 24px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;">

      <!-- Wordmark -->
      <tr><td style="padding-bottom:44px;">
        <span style="font-size:26px;letter-spacing:0.18em;color:#f0ece2;font-weight:700;text-transform:uppercase;">SOLUM</span>
      </td></tr>

      <!-- Eyebrow -->
      <tr><td style="border-top:1px solid rgba(240,236,226,0.07);padding-top:36px;padding-bottom:12px;">
        <span style="font-size:11px;letter-spacing:5px;text-transform:uppercase;color:#4a8fc7;font-weight:700;">
          Founding 100 · Members Only
        </span>
      </td></tr>

      <!-- Heading -->
      <tr><td style="padding-bottom:20px;">
        <h1 style="margin:0;font-size:38px;letter-spacing:0.03em;color:#f0ece2;font-weight:700;line-height:1.1;">
          Your login link.
        </h1>
      </td></tr>

      <!-- Body -->
      <tr><td style="padding-bottom:36px;">
        <p style="margin:0;font-size:16px;color:rgba(240,236,226,0.80);line-height:1.7;">
          Click below to enter the Founding 100 portal.<br/>
          This link expires in <strong style="color:#f0ece2;">1 hour</strong> and can only be used once.
        </p>
      </td></tr>

      <!-- CTA -->
      <tr><td style="padding-bottom:40px;">
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:#2e6da4;">
              <a href="${magicLink}"
                 style="display:inline-block;background:#2e6da4;color:#f0ece2;
                        font-size:13px;letter-spacing:4px;text-transform:uppercase;
                        font-weight:700;padding:20px 48px;text-decoration:none;
                        line-height:1;">
                ENTER THE PORTAL
              </a>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- Link fallback -->
      <tr><td style="padding-bottom:40px;">
        <p style="margin:0 0 6px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:rgba(240,236,226,0.35);font-weight:600;">
          Button not working?
        </p>
        <p style="margin:0;font-size:13px;color:rgba(240,236,226,0.40);line-height:1.6;word-break:break-all;">
          ${magicLink}
        </p>
      </td></tr>

      <!-- Status strip -->
      <tr><td style="padding:24px 28px;background:#181c24;border:1px solid rgba(74,143,199,0.15);margin-bottom:36px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="33%" style="text-align:center;padding:0 8px;">
              <div style="font-size:22px;font-weight:700;letter-spacing:0.03em;color:#4a8fc7;line-height:1;margin-bottom:6px;">1%</div>
              <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:rgba(240,236,226,0.55);font-weight:600;">Equity</div>
            </td>
            <td width="33%" style="text-align:center;padding:0 8px;border-left:1px solid rgba(240,236,226,0.07);border-right:1px solid rgba(240,236,226,0.07);">
              <div style="font-size:22px;font-weight:700;letter-spacing:0.03em;color:#f0ece2;line-height:1;margin-bottom:6px;">100</div>
              <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:rgba(240,236,226,0.55);font-weight:600;">Spots Ever</div>
            </td>
            <td width="33%" style="text-align:center;padding:0 8px;">
              <div style="font-size:22px;font-weight:700;letter-spacing:0.03em;color:#f0ece2;line-height:1;margin-bottom:6px;">£0</div>
              <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:rgba(240,236,226,0.55);font-weight:600;">To Join</div>
            </td>
          </tr>
        </table>
      </td></tr>

      <tr><td style="height:36px;"></td></tr>

      <!-- Footer -->
      <tr><td style="border-top:1px solid rgba(240,236,226,0.06);padding-top:24px;">
        <p style="margin:0 0 6px;font-size:12px;color:rgba(240,236,226,0.28);line-height:1.6;">
          You requested a login link for the SOLUM Founding 100 portal. If this wasn't you, ignore this email — nothing will happen.
        </p>
        <p style="margin:0;font-size:12px;color:rgba(240,236,226,0.28);">
          SOLUM · bysolum.co.uk
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  let email: string;
  try {
    const body = await req.json();
    email = body?.email?.trim().toLowerCase();
  } catch {
    return new Response(JSON.stringify({ ok: false, reason: 'invalid_body' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!email) {
    return new Response(JSON.stringify({ ok: false, reason: 'missing_email' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Confirm email is invited or already a founding member
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('email', email)
    .or('is_founding_member.eq.true,founding_invited_at.not.is.null')
    .is('exit_at', null)
    .maybeSingle();

  if (!customer) {
    return new Response(JSON.stringify({ ok: false, reason: 'not_invited' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Call the auth REST API directly — the JS SDK ignores options.redirectTo in generateLink,
  // but the underlying GoTrue API supports redirect_to as a top-level body field.
  const genRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'magiclink',
      email,
      // Supabase validates redirect_to against the allowed list by stripping query params,
      // so ?founding=1 on the root domain passes validation. AuthRedirectGuard reads the
      // param and routes to /founding-100 instead of /account.
      redirect_to: `${SITE_URL}?founding=1`,
    }),
  });

  if (!genRes.ok) {
    const err = await genRes.text();
    console.error('[send-founding-magic-link] generate_link error:', err);
    return new Response(JSON.stringify({ ok: false, reason: 'link_generation_failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const genData = await genRes.json();
  const magicLink: string = genData.action_link;
  if (!magicLink) {
    console.error('[send-founding-magic-link] no action_link in response:', JSON.stringify(genData));
    return new Response(JSON.stringify({ ok: false, reason: 'link_generation_failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) {
    return new Response(JSON.stringify({ ok: false, reason: 'resend_not_configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'SOLUM <no-reply@orders.bysolum.co.uk>',
      to: [email],
      subject: 'Your SOLUM Founding Portal login link',
      html: buildEmail(email, magicLink),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[send-founding-magic-link] Resend error:', err);
    return new Response(JSON.stringify({ ok: false, reason: 'send_failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
