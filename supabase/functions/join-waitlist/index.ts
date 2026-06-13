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


function buildConfirmEmail(email: string, firstName: string | null, _token: string, _position: number): string {
  const greeting = firstName ? firstName : null

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>You're on the list — SOLUM</title>
</head>
<body style="margin:0;padding:0;background:#111111;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#111111;padding:0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- Header -->
  <tr><td style="background:#08090B;padding:32px 48px 26px;border-bottom:1px solid #181c24;">
    <img src="https://bysolum.co.uk/solum-wordmark-email.png" alt="SOLUM" width="130" style="display:block;height:auto;border:0;" />
    <p style="margin:10px 0 0;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#4A8FC7;font-weight:600;">Your body. Done right.</p>
  </td></tr>

  <!-- Hero -->
  <tr><td style="background:#08090B;padding:48px 48px 0;">
    <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr><td style="background:rgba(224,92,92,0.1);border:1px solid rgba(224,92,92,0.35);padding:5px 14px;">
        <p style="margin:0;font-size:9px;letter-spacing:4px;text-transform:uppercase;color:#e05c5c;font-weight:700;">Sold Out</p>
      </td></tr>
    </table>
    <h1 style="margin:0 0 16px;font-size:44px;font-weight:700;letter-spacing:0.04em;color:#F0ECE2;text-transform:uppercase;line-height:0.95;">
      You're<br />On The List.
    </h1>
    <div style="width:48px;height:1px;background:#2E6DA4;margin-bottom:24px;"></div>
    <p style="margin:0 0 32px;font-size:15px;color:rgba(240,236,226,0.7);line-height:1.75;max-width:440px;">
      ${greeting ? `${greeting}, we're` : `We're`} sorry you got this far and ran into a sold-out. The first batch went faster than expected. Your details are saved — you will hear from us the moment it's back in stock.
    </p>
  </td></tr>

  <!-- Founder note -->
  <tr><td style="background:#08090B;padding:0 48px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#181C24;border:1px solid #1e2530;border-left:2px solid #2E6DA4;">
      <tr><td style="padding:24px 28px;">
        <p style="margin:0 0 4px;font-size:9px;letter-spacing:4px;text-transform:uppercase;color:#4A8FC7;font-weight:700;">From the Founder</p>
        <p style="margin:12px 0 16px;font-size:15px;color:rgba(240,236,226,0.85);line-height:1.75;font-style:italic;">
          "I'm genuinely sorry. You did everything right and we ran out. I built SOLUM because I believe in what it does — and running out of stock on people who want it is the worst feeling. I'm personally working on the restock. You will hear from me the moment it's ready."
        </p>
        <p style="margin:0;font-size:13px;color:rgba(240,236,226,0.55);font-weight:600;">— Harsha &nbsp;·&nbsp; Founder, SOLUM</p>
      </td></tr>
    </table>
  </td></tr>

  <!-- What happens next -->
  <tr><td style="background:#08090B;padding:0 48px 40px;">
    <p style="margin:0 0 20px;font-size:9px;letter-spacing:4px;text-transform:uppercase;color:#4A8FC7;font-weight:700;">What Happens Next</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #1e2530;">
      <tr><td style="background:#181C24;padding:20px 24px;border-bottom:1px solid #1e2530;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td width="28" style="vertical-align:top;padding-top:2px;">
            <span style="font-size:20px;font-weight:700;color:#2E6DA4;line-height:1;">1</span>
          </td>
          <td>
            <p style="margin:0 0 3px;font-size:14px;font-weight:600;color:#F0ECE2;">You're saved. Nothing to do.</p>
            <p style="margin:0;font-size:13px;color:rgba(240,236,226,0.5);line-height:1.6;">We've got your name and email. No form to fill in, no link to click. You're already on the list.</p>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="background:#181C24;padding:20px 24px;border-bottom:1px solid #1e2530;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td width="28" style="vertical-align:top;padding-top:2px;">
            <span style="font-size:20px;font-weight:700;color:#2E6DA4;line-height:1;">2</span>
          </td>
          <td>
            <p style="margin:0 0 3px;font-size:14px;font-weight:600;color:#F0ECE2;">We restock. You're first.</p>
            <p style="margin:0;font-size:13px;color:rgba(240,236,226,0.5);line-height:1.6;">When it's back in stock, we'll email you before anyone else. First access — no queue, no lottery.</p>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="background:#181C24;padding:20px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td width="28" style="vertical-align:top;padding-top:2px;">
            <span style="font-size:20px;font-weight:700;color:#2E6DA4;line-height:1;">3</span>
          </td>
          <td>
            <p style="margin:0 0 3px;font-size:14px;font-weight:600;color:#F0ECE2;">Follow for updates</p>
            <p style="margin:0;font-size:13px;color:rgba(240,236,226,0.5);line-height:1.6;">We post restock updates on Instagram as soon as they're confirmed. Follow <span style="color:#4A8FC7;font-weight:600;">@bysolum.body</span> to stay close.</p>
          </td>
        </tr></table>
      </td></tr>
    </table>
  </td></tr>

  <!-- Instagram CTA -->
  <tr><td style="background:#08090B;padding:0 48px 48px;">
    <a href="https://instagram.com/bysolum.body" style="display:block;border:1px solid #1e2530;padding:16px 24px;text-decoration:none;">
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:middle;padding-right:16px;">
          <div style="width:36px;height:36px;border-radius:9px;background:linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);text-align:center;line-height:36px;font-size:18px;">📷</div>
        </td>
        <td style="vertical-align:middle;">
          <p style="margin:0;font-size:14px;font-weight:700;color:#F0ECE2;letter-spacing:0.5px;">@bysolum.body</p>
          <p style="margin:2px 0 0;font-size:11px;color:rgba(240,236,226,0.45);letter-spacing:1px;">Follow for restock updates</p>
        </td>
      </tr></table>
    </a>
  </td></tr>

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
    const { email, first_name, last_name, phone, line1, line2, city, postcode, source, utm_medium, utm_campaign, referred_by } = await req.json()

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
        email:           normalised,
        first_name:      first_name?.trim()  || null,
        last_name:       last_name?.trim()   || null,
        phone:           phone?.trim()       || null,
        line1:           line1?.trim()       || null,
        line2:           line2?.trim()       || null,
        city:            city?.trim()        || null,
        postcode:        postcode?.trim()    || null,
        checkout_status: 'waitlist',
        source:          source              || null,
        utm_medium:      utm_medium          || null,
        utm_campaign:    utm_campaign        || null,
        referred_by:     referred_by         || null,
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

    // Send waitlist email
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (resendKey && inserted) {
      const subject = `You're on the list. We'll be in touch the moment it's back.`

      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'SOLUM <no-reply@orders.bysolum.co.uk>',
            to: [normalised],
            subject,
            html: buildConfirmEmail(normalised, first_name?.trim() || null, inserted.confirm_token ?? '', position),
          }),
        })
        if (!res.ok) {
          const body = await res.text()
          console.error('Resend error', res.status, body)
        }
      } catch (e) {
        console.error('Resend fetch error:', e)
      }
    }

    return json({ success: true, position })

  } catch (err) {
    console.error(err)
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
})
