/**
 * One-off function: send Founder 100 confirmation emails to Mailchimp-imported
 * leads who never received a confirmation email (confirmed_at IS NULL, source = 'mailchimp_import').
 *
 * Invoke with a secret key to prevent accidental re-runs:
 *   POST /functions/v1/send-founder-confirmations
 *   Authorization: Bearer <SUPABASE_ANON_KEY>
 *   Body: { "secret": "send-it" }
 *
 * Returns a list of results per email.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function buildConfirmEmail(
  email: string,
  firstName: string | null,
  token: string,
  position: number,
): string {
  const siteUrl = Deno.env.get('SITE_URL') || 'https://bysolum.co.uk'
  const confirmUrl = `${siteUrl}/confirm?token=${token}`
  const greeting = firstName ? `${firstName},` : 'Hey,'

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Confirm your SOLUM Founding Member spot</title>
</head>
<body style="margin:0;padding:0;background:#08090b;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#08090b;padding:48px 24px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

      <!-- Logo -->
      <tr><td style="padding-bottom:40px;">
        <span style="font-size:28px;letter-spacing:0.18em;color:#f0ece2;font-weight:700;">SOLUM</span>
      </td></tr>

      <!-- Heading -->
      <tr><td style="padding-bottom:8px;border-top:1px solid rgba(240,236,226,0.08);padding-top:36px;">
        <p style="margin:0;font-size:11px;letter-spacing:5px;text-transform:uppercase;color:#4a8fc7;font-weight:600;">
          Founding Member
        </p>
      </td></tr>
      <tr><td style="padding-bottom:20px;">
        <h1 style="margin:0;font-size:36px;letter-spacing:0.04em;color:#f0ece2;font-weight:700;line-height:1.1;">
          Confirm your<br/>Founding Member spot.
        </h1>
      </td></tr>

      <!-- Body -->
      <tr><td style="padding-bottom:32px;">
        <p style="margin:0;font-size:16px;color:rgba(240,236,226,0.82);line-height:1.65;">
          ${greeting} you're <strong style="color:#f0ece2;">Founding Member #${position}</strong>.
          One click to confirm your email and lock it in.
        </p>
      </td></tr>

      <!-- CTA -->
      <tr><td style="padding-bottom:36px;">
        <a href="${confirmUrl}"
           style="display:inline-block;background:#2e6da4;color:#f0ece2;font-size:15px;
                  letter-spacing:3px;text-transform:uppercase;font-weight:700;
                  padding:18px 40px;text-decoration:none;">
          CONFIRM MY SPOT
        </a>
      </td></tr>

      <!-- Founder benefits -->
      <tr><td style="padding:24px;background:rgba(46,109,164,0.08);border:1px solid rgba(46,109,164,0.2);margin-bottom:32px;">
        <p style="margin:0 0 12px;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#4a8fc7;font-weight:600;">What you get as a Founding Member</p>
        <p style="margin:0 0 6px;font-size:14px;color:rgba(240,236,226,0.85);line-height:1.6;">
          → <strong style="color:#f0ece2;">Locked pricing forever</strong> — your launch price never increases
        </p>
        <p style="margin:0 0 6px;font-size:14px;color:rgba(240,236,226,0.85);line-height:1.6;">
          → <strong style="color:#f0ece2;">Every new product</strong> — automatically in your next box, no charge
        </p>
        <p style="margin:0;font-size:14px;color:rgba(240,236,226,0.85);line-height:1.6;">
          → <strong style="color:#f0ece2;">Direct input</strong> — fragrance, formula, product decisions
        </p>
      </td></tr>
      <tr><td style="height:32px;"></td></tr>

      <!-- Footer -->
      <tr><td style="border-top:1px solid rgba(240,236,226,0.07);padding-top:24px;">
        <p style="margin:0 0 8px;font-size:12px;color:rgba(240,236,226,0.35);line-height:1.6;">
          You signed up to SOLUM via our waitlist. If this wasn't you, ignore this email — nothing will happen.
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Guard: require a secret body param to prevent accidental re-runs
  let secret: string | undefined
  try {
    const body = await req.json()
    secret = body?.secret
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), { status: 400, headers: corsHeaders })
  }

  if (secret !== 'send-it') {
    return new Response(JSON.stringify({ error: 'Missing or incorrect secret.' }), { status: 403, headers: corsHeaders })
  }

  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not set.' }), { status: 500, headers: corsHeaders })
  }

  // Fetch all unconfirmed bulk-imported leads — identified by their shared import timestamp
  const BULK_IMPORT_TS = '2026-04-10T15:30:47.907885+00:00'
  const { data: leads, error } = await db
    .from('leads')
    .select('id, email, first_name, confirm_token')
    .eq('checkout_status', 'waitlist')
    .eq('created_at', BULK_IMPORT_TS)
    .is('confirmed_at', null)
    .order('email', { ascending: true })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }

  if (!leads || leads.length === 0) {
    return new Response(JSON.stringify({ message: 'No unconfirmed mailchimp leads found.', sent: 0 }), { status: 200, headers: corsHeaders })
  }

  // Get total waitlist count to determine each lead's approximate position
  // For Founder 100: all mailchimp-imported leads are within the first 100 — assign positions 1..N
  const results: { email: string; status: string; position: number }[] = []

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i]
    const position = i + 1 // All mailchimp leads are early — treat as Founders 1..N

    const subject = `Confirm your Founding Member spot — #${position} of 100`

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'SOLUM <no-reply@orders.bysolum.com>',
          to: [lead.email],
          subject,
          html: buildConfirmEmail(lead.email, lead.first_name, lead.confirm_token, position),
        }),
      })

      if (res.ok) {
        results.push({ email: lead.email, status: 'sent', position })
      } else {
        const err = await res.text()
        results.push({ email: lead.email, status: `error: ${err}`, position })
      }
    } catch (e) {
      results.push({ email: lead.email, status: `exception: ${e}`, position })
    }

    // Small delay to avoid Resend rate limits
    await new Promise(r => setTimeout(r, 150))
  }

  const sent = results.filter(r => r.status === 'sent').length
  return new Response(
    JSON.stringify({ sent, total: leads.length, results }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
