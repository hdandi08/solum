import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com','guerrillamail.com','guerrillamail.net','guerrillamail.org',
  'guerrillamail.biz','guerrillamail.de','guerrillamail.info','guerrillamail.com',
  'sharklasers.com','guerrillamailblock.com','grr.la','spam4.me',
  'trashmail.com','trashmail.me','trashmail.net','trashmail.io','trashmail.at',
  'trashmail.org','trashmail.xyz','trashmail.app','yopmail.com','yopmail.fr',
  'cool.fr.nf','jetable.fr.nf','nospam.ze.tc','nomail.xl.cx','mega.zik.dj',
  'speed.1s.fr','courriel.fr.nf','moncourrier.fr.nf','monemail.fr.nf','monmail.fr.nf',
  '10minutemail.com','10minutemail.net','10minutemail.org','10minutemail.de',
  '10minutemail.co.za','10minutemail.info','minutemail.com','20minutemail.com',
  'dispostable.com','mailnull.com','maildrop.cc','throwam.com','throwam.net',
  'tempmail.com','tempmail.net','tempmail.org','tempmail.de','tempr.email',
  'tempinbox.com','discard.email','fakeinbox.com','mailnesia.com','pookmail.com',
  'spamgourmet.com','spamgourmet.net','spamgourmet.org','getnada.com',
  'nada.email','mohmal.com','getonemail.com','filzmail.com','binkmail.com',
  'bob.email','mailinater.com','spamavert.com','mytrashmail.com','crazymailing.com',
])

function isValidFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
}

async function hasMxRecords(domain: string): Promise<boolean> {
  try {
    const records = await Deno.resolveDns(domain, 'MX')
    return records.length > 0
  } catch {
    return false
  }
}


function buildConfirmEmail(email: string, firstName: string | null, token: string, position: number): string {
  const siteUrl = Deno.env.get('SITE_URL') || 'https://bysolum.co.uk'
  const confirmUrl = `${siteUrl}/confirm?token=${token}`
  const greeting = firstName ? `${firstName},` : 'Hey,'

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Confirm your spot — 20% off waiting</title>
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
                <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(240,236,226,0.3);font-weight:600;margin-top:4px;">20% off</div>
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
          Confirm your spot.<br/>Lock in 20% off.
        </h1>
      </td></tr>

      <!-- Body -->
      <tr><td style="padding-bottom:32px;">
        <p style="margin:0;font-size:16px;color:rgba(240,236,226,0.78);line-height:1.65;">
          ${greeting} one click below confirms your email and locks in your <strong style="color:#f0ece2;">20% launch discount</strong>. Your code arrives in a separate email the day we go live.
        </p>
      </td></tr>

      <!-- CTA -->
      <tr><td style="padding-bottom:36px;">
        <a href="${confirmUrl}"
           style="display:inline-block;background:#2e6da4;color:#f0ece2;font-size:14px;
                  letter-spacing:3px;text-transform:uppercase;font-weight:700;
                  padding:18px 40px;text-decoration:none;">
          CONFIRM &amp; LOCK IN 20% OFF
        </a>
      </td></tr>

      <!-- What's locked in -->
      <tr><td style="padding-bottom:32px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(46,109,164,0.25);">
          <tr><td style="padding:14px 20px;border-bottom:1px solid rgba(240,236,226,0.07);">
            <p style="margin:0;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#4a8fc7;font-weight:600;">What you get</p>
          </td></tr>
          <tr><td style="padding:0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="33%" style="padding:20px 16px;border-right:1px solid rgba(240,236,226,0.07);text-align:center;vertical-align:top;">
                  <div style="font-size:28px;font-weight:800;color:#4a8fc7;line-height:1;margin-bottom:6px;">20%</div>
                  <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(240,236,226,0.55);font-weight:600;">Off at launch</div>
                </td>
                <td width="33%" style="padding:20px 16px;border-right:1px solid rgba(240,236,226,0.07);text-align:center;vertical-align:top;">
                  <div style="font-size:28px;font-weight:800;color:#4a8fc7;line-height:1;margin-bottom:6px;">#${position}</div>
                  <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(240,236,226,0.55);font-weight:600;">Of 100 spots</div>
                </td>
                <td width="33%" style="padding:20px 16px;text-align:center;vertical-align:top;">
                  <div style="font-size:28px;font-weight:800;color:#4a8fc7;line-height:1;margin-bottom:6px;">1st</div>
                  <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(240,236,226,0.55);font-weight:600;">To ship</div>
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

  try {
    const { email, first_name, source, utm_medium, utm_campaign, referred_by } = await req.json()

    const normalised = (email ?? '').trim().toLowerCase()

    if (!normalised || !isValidFormat(normalised)) {
      return json({ error: 'Please enter a valid email address.' }, 400)
    }

    const domain = normalised.split('@')[1]

    if (DISPOSABLE_DOMAINS.has(domain)) {
      return json({ error: 'Disposable email addresses are not accepted. Please use your real email.' }, 400)
    }

    const mxOk = await hasMxRecords(domain)
    if (!mxOk) {
      return json({ error: `The domain "${domain}" doesn't look right — double-check your email address.` }, 400)
    }

    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Duplicate check
    const { data: existing } = await db
      .from('leads')
      .select('id')
      .eq('email', normalised)
      .eq('checkout_status', 'waitlist')
      .maybeSingle()

    if (existing) {
      return json({ error: "You're already on the list — we'll email you at launch." }, 409)
    }

    // Insert — confirm_token is auto-generated by the DB default
    const { data: inserted, error: insertError } = await db
      .from('leads')
      .insert({
        email: normalised,
        first_name: first_name?.trim() || null,
        checkout_status: 'waitlist',
        source: source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        referred_by: referred_by || null,
      })
      .select('confirm_token')
      .single()

    if (insertError) throw insertError

    // Get position
    const { count } = await db
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('checkout_status', 'waitlist')

    const position = count ?? 1

    // Send confirmation email (non-blocking — don't fail the signup if email fails)
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (resendKey && inserted?.confirm_token) {
      const subject = `Confirm your spot — 20% off waiting for you`

      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'SOLUM <no-reply@orders.bysolum.co.uk>',
          to: [normalised],
          subject,
          html: buildConfirmEmail(normalised, first_name?.trim() || null, inserted.confirm_token, position),
        }),
      }).catch(e => console.error('Resend error:', e))

      return json({ success: true, position })
    }

    return json({ success: true, position })

  } catch (err) {
    console.error(err)
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
})
