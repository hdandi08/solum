// supabase/functions/send-account-magic-link/index.ts
// Public — validates customer email, generates magic link, sends branded account email via Resend.
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

function buildEmail(magicLink: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Your SOLUM account login link</title>
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
        <span style="font-size:11px;letter-spacing:5px;text-transform:uppercase;color:rgba(240,236,226,0.50);font-weight:700;">
          Your Account
        </span>
      </td></tr>

      <!-- Heading -->
      <tr><td style="padding-bottom:20px;">
        <h1 style="margin:0;font-size:38px;letter-spacing:0.03em;color:#f0ece2;font-weight:700;line-height:1.1;">
          Sign in to SOLUM.
        </h1>
      </td></tr>

      <!-- Body -->
      <tr><td style="padding-bottom:36px;">
        <p style="margin:0;font-size:16px;color:rgba(240,236,226,0.80);line-height:1.7;">
          Click the button below to access your account.<br/>
          This link expires in <strong style="color:#f0ece2;">1 hour</strong> and can only be used once.
        </p>
      </td></tr>

      <!-- CTA -->
      <tr><td style="padding-bottom:40px;">
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:#f0ece2;">
              <a href="${magicLink}"
                 style="display:inline-block;background:#f0ece2;color:#08090b;
                        font-size:13px;letter-spacing:4px;text-transform:uppercase;
                        font-weight:700;padding:20px 48px;text-decoration:none;
                        line-height:1;">
                ACCESS MY ACCOUNT
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

      <!-- Footer -->
      <tr><td style="border-top:1px solid rgba(240,236,226,0.06);padding-top:24px;">
        <p style="margin:0 0 6px;font-size:12px;color:rgba(240,236,226,0.28);line-height:1.6;">
          You requested a login link for your SOLUM account. If this wasn't you, ignore this email — nothing will happen.
        </p>
        <p style="margin:0;font-size:12px;color:rgba(240,236,226,0.28);">
          SOLUM · bysolum.co.uk · <a href="mailto:contact@bysolum.co.uk" style="color:rgba(240,236,226,0.28);text-decoration:none;">contact@bysolum.co.uk</a>
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

  // Confirm a customer account exists for this email
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (!customer) {
    return new Response(JSON.stringify({ ok: false, reason: 'no_account' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

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
      redirect_to: `${SITE_URL}/account`,
    }),
  });

  if (!genRes.ok) {
    const err = await genRes.text();
    console.error('[send-account-magic-link] generate_link error:', err);
    return new Response(JSON.stringify({ ok: false, reason: 'link_generation_failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const genData = await genRes.json();
  const magicLink: string = genData.action_link;
  if (!magicLink) {
    console.error('[send-account-magic-link] no action_link in response:', JSON.stringify(genData));
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
      subject: 'Your SOLUM account login link',
      html: buildEmail(magicLink),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[send-account-magic-link] Resend error:', err);
    return new Response(JSON.stringify({ ok: false, reason: 'send_failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
