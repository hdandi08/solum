import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-run-key',
}

function buildConfirmEmail(token: string, position: number, firstName: string | null): string {
  const siteUrl = Deno.env.get('SITE_URL') || 'https://bysolum.co.uk'
  const confirmUrl = `${siteUrl}/confirm?token=${token}`
  const greeting = firstName ? `${firstName},` : 'Hey,'

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Confirm your spot — spaces filling fast</title>
</head>
<body style="margin:0;padding:0;background:#08090b;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#08090b;padding:48px 24px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

      <!-- Logo -->
      <tr><td style="padding-bottom:40px;">
        <span style="font-size:28px;letter-spacing:0.18em;color:#f0ece2;font-weight:700;">SOLUM</span>
      </td></tr>

      <!-- Step indicator -->
      <tr><td style="padding-bottom:32px;border-top:1px solid rgba(240,236,226,0.08);padding-top:32px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" width="33%" style="padding:0 4px;">
              <div style="background:rgba(46,109,164,0.15);border:1px solid rgba(46,109,164,0.4);padding:12px 8px;text-align:center;">
                <div style="font-size:22px;font-weight:700;color:#4a8fc7;line-height:1;">✓</div>
                <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#4a8fc7;font-weight:600;margin-top:4px;">Signed up</div>
              </div>
            </td>
            <td align="center" width="33%" style="padding:0 4px;">
              <div style="background:rgba(46,109,164,0.25);border:1px solid rgba(74,143,199,0.8);padding:12px 8px;text-align:center;">
                <div style="font-size:22px;font-weight:700;color:#f0ece2;line-height:1;">2</div>
                <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#f0ece2;font-weight:600;margin-top:4px;">Confirm</div>
              </div>
            </td>
            <td align="center" width="33%" style="padding:0 4px;">
              <div style="background:rgba(240,236,226,0.03);border:1px solid rgba(240,236,226,0.1);padding:12px 8px;text-align:center;">
                <div style="font-size:22px;font-weight:700;color:rgba(240,236,226,0.3);line-height:1;">3</div>
                <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(240,236,226,0.3);font-weight:600;margin-top:4px;">Ship first</div>
              </div>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- Heading -->
      <tr><td style="padding-bottom:12px;">
        <p style="margin:0;font-size:11px;letter-spacing:5px;text-transform:uppercase;color:#4a8fc7;font-weight:600;">Early Access · #${position} of 100</p>
      </td></tr>
      <tr><td style="padding-bottom:16px;">
        <h1 style="margin:0;font-size:34px;letter-spacing:0.02em;color:#f0ece2;font-weight:700;line-height:1.1;">
          Spaces are filling fast.<br/>Confirm your spot.
        </h1>
      </td></tr>

      <!-- Body -->
      <tr><td style="padding-bottom:32px;">
        <p style="margin:0;font-size:16px;color:rgba(240,236,226,0.78);line-height:1.65;">
          ${greeting} confirm your spot now and you'll be first to ship — before we open to everyone else.
        </p>
      </td></tr>

      <!-- CTA -->
      <tr><td style="padding-bottom:36px;">
        <a href="${confirmUrl}"
           style="display:inline-block;background:#2e6da4;color:#f0ece2;font-size:14px;
                  letter-spacing:3px;text-transform:uppercase;font-weight:700;
                  padding:18px 40px;text-decoration:none;">
          CONFIRM MY SPOT
        </a>
      </td></tr>

      <!-- Stats grid -->
      <tr><td style="padding-bottom:32px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(46,109,164,0.25);">
          <tr><td style="padding:14px 20px;border-bottom:1px solid rgba(240,236,226,0.07);">
            <p style="margin:0;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#4a8fc7;font-weight:600;">What confirming gets you</p>
          </td></tr>
          <tr><td style="padding:0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="33%" style="padding:20px 16px;border-right:1px solid rgba(240,236,226,0.07);text-align:center;vertical-align:top;">
                  <div style="font-size:28px;font-weight:800;color:#4a8fc7;line-height:1;margin-bottom:6px;">#${position}</div>
                  <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(240,236,226,0.55);font-weight:600;">Of 100 spots</div>
                </td>
                <td width="33%" style="padding:20px 16px;border-right:1px solid rgba(240,236,226,0.07);text-align:center;vertical-align:top;">
                  <div style="font-size:28px;font-weight:800;color:#4a8fc7;line-height:1;margin-bottom:6px;">1st</div>
                  <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(240,236,226,0.55);font-weight:600;">To ship</div>
                </td>
                <td width="33%" style="padding:20px 16px;text-align:center;vertical-align:top;">
                  <div style="font-size:28px;font-weight:800;color:#4a8fc7;line-height:1;margin-bottom:6px;">100</div>
                  <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(240,236,226,0.55);font-weight:600;">Spaces total</div>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </td></tr>

      <!-- Footer -->
      <tr><td style="border-top:1px solid rgba(240,236,226,0.07);padding-top:24px;">
        <p style="margin:0 0 8px;font-size:12px;color:rgba(240,236,226,0.35);line-height:1.6;">
          If you didn't sign up to SOLUM, ignore this — nothing will happen.
        </p>
        <p style="margin:0;font-size:12px;color:rgba(240,236,226,0.35);">
          bysolum.co.uk · contact@bysolum.com
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Simple run-key guard so this can't be triggered accidentally
  const runKey = req.headers.get('x-run-key')
  if (runKey !== 'solum-send-confirmations-2026') {
    return json({ error: 'Unauthorized' }, 401)
  }

  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return json({ error: 'RESEND_API_KEY not set' }, 500)

  // Fetch all unconfirmed waitlist leads ordered by signup date
  const { data: leads, error } = await db
    .from('leads')
    .select('email, first_name, confirm_token, created_at')
    .eq('checkout_status', 'waitlist')
    .is('confirmed_at', null)
    .neq('email', 'test@bysolum.com')
    .order('created_at', { ascending: true })

  if (error) return json({ error: error.message }, 500)
  if (!leads || leads.length === 0) return json({ sent: 0, message: 'No unconfirmed leads.' })

  // Get the total count to determine positions
  const { count: totalCount } = await db
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('checkout_status', 'waitlist')

  const results: { email: string; status: number }[] = []

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i]
    if (!lead.confirm_token) continue

    // Position = their rank among all signups (approximate by index in ordered results)
    const position = i + 1

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'SOLUM <no-reply@orders.bysolum.co.uk>',
        to: [lead.email],
        subject: 'Spaces are filling fast — confirm your spot',
        html: buildConfirmEmail(lead.confirm_token, position, lead.first_name),
      }),
    })

    results.push({ email: lead.email, status: res.status })

    // Small delay to avoid Resend rate limits
    await new Promise(r => setTimeout(r, 150))
  }

  const sent = results.filter(r => r.status === 200).length
  const failed = results.filter(r => r.status !== 200)

  return json({ sent, total: leads.length, failed, results })
})
