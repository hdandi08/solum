import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-run-key',
}

// Tracked links: attribute returning leads / purchases back to this email campaign.
const CTA_URL = 'https://bysolum.co.uk/?utm_source=email&utm_medium=email&utm_campaign=free_delivery'
const LOGO_URL = 'https://bysolum.co.uk/email/solum-logo.png'
const HERO_URL = 'https://bysolum.co.uk/email/promo-man.jpg'

function buildFreeDeliveryEmail(firstName: string | null): string {
  const greeting = firstName ? `${firstName}, this one's easy.` : `This one's easy.`
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Free delivery on your SOLUM kit</title>
<style>body,#bgwrap{background-color:#08090B !important;}</style>
</head>
<body bgcolor="#08090B" style="margin:0;padding:0;background-color:#08090B;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table id="bgwrap" width="100%" cellpadding="0" cellspacing="0" bgcolor="#08090B" style="background-color:#08090B;border-collapse:collapse;">
<tr><td align="center" bgcolor="#08090B" style="background-color:#08090B;padding:0;">
<table width="600" cellpadding="0" cellspacing="0" bgcolor="#08090B" style="max-width:600px;width:100%;border-collapse:collapse;background-color:#08090B;">

  <tr><td bgcolor="#08090B" style="background-color:#08090B;padding:28px 36px 26px;">
    <img src="${LOGO_URL}" alt="SOLUM" width="118" style="display:block;border:0;height:auto;" />
    <p style="margin:9px 0 0;font-size:9px;letter-spacing:4px;text-transform:uppercase;color:#4A8FC7;font-weight:600;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Your body. Done right.</p>
  </td></tr>

  <tr><td bgcolor="#08090B" style="background-color:#08090B;padding:0;line-height:0;">
    <a href="${CTA_URL}" style="display:block;">
      <img src="${HERO_URL}" alt="SOLUM body wash, poured. Cleans, doesn't strip." width="600" style="display:block;width:100%;max-width:600px;border:0;" />
    </a>
  </td></tr>

  <tr><td bgcolor="#08090B" style="background-color:#08090B;padding:40px 36px 8px;">
    <p style="margin:0 0 10px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#4A8FC7;font-weight:600;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Launch offer</p>
    <p style="margin:0 0 20px;font-size:26px;font-weight:700;color:#F0ECE2;line-height:1.25;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">${greeting}<br/>Free delivery, and the first batch is going fast.</p>
    <p style="margin:0 0 16px;font-size:15px;color:rgba(240,236,226,0.75);line-height:1.75;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
      You signed up for SOLUM and never finished. Here's a reason to. For launch, UK delivery is free on every kit, worth £5.95, on us. Not a sale, not a gimmick, just one less thing between you and a body that's finally done right.
    </p>
    <p style="margin:0 0 28px;font-size:15px;color:rgba(240,236,226,0.75);line-height:1.75;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
      This is the first batch. Limited kits. Once they're gone, that's it until the next run.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 14px;">
      <tr>
        <td bgcolor="#F0ECE2" style="background:#F0ECE2;">
          <a href="${CTA_URL}"
             style="display:inline-block;background:#F0ECE2;color:#08090B;font-size:13px;letter-spacing:4px;text-transform:uppercase;font-weight:700;padding:18px 46px;text-decoration:none;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
            Claim free delivery &rarr;
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:12px;color:rgba(240,236,226,0.35);font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Free UK delivery, worth £5.95 · Royal Mail Tracked 48 · UK only</p>
  </td></tr>

  <tr><td bgcolor="#08090B" style="background-color:#08090B;padding:24px 36px 0;">
    <div style="height:1px;background:rgba(46,109,164,0.2);"></div>
  </td></tr>

  <tr><td bgcolor="#08090B" style="background-color:#08090B;padding:28px 36px 34px;">
    <p style="margin:0 0 22px;font-size:15px;color:rgba(240,236,226,0.75);line-height:1.75;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
      Most men shower every day and still have rough skin, a back nobody's ever properly cleaned, and a scalp they've ignored for years. SOLUM is the system that fixes it, head to toe. If you've been putting it off, free delivery is as good a nudge as you'll get.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 6px;">
      <tr>
        <td bgcolor="#F0ECE2" style="background:#F0ECE2;">
          <a href="${CTA_URL}"
             style="display:inline-block;background:#F0ECE2;color:#08090B;font-size:13px;letter-spacing:4px;text-transform:uppercase;font-weight:700;padding:18px 46px;text-decoration:none;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
            Order now &rarr;
          </a>
        </td>
      </tr>
    </table>
  </td></tr>

  <tr><td bgcolor="#08090B" style="background-color:#08090B;padding:8px 36px 34px;">
    <p style="margin:0;font-size:14px;color:rgba(240,236,226,0.6);line-height:1.6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
      Harsha<br/>
      <span style="font-size:12px;color:rgba(240,236,226,0.3);">Founder, SOLUM</span>
    </p>
  </td></tr>

  <tr><td bgcolor="#0c0e12" style="background:#0c0e12;border-top:1px solid #181c24;padding:20px 36px 24px;">
    <p style="margin:0 0 6px;font-size:11px;color:rgba(240,236,226,0.25);line-height:1.6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
      You're getting this because you signed up at bysolum.co.uk. Questions? <a href="mailto:contact@bysolum.com" style="color:#4A8FC7;text-decoration:none;">contact@bysolum.com</a>
    </p>
    <p style="margin:0;font-size:10px;color:rgba(240,236,226,0.15);letter-spacing:1px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">SOLUM · bysolum.co.uk</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }
function norm(e: string) { return e.trim().toLowerCase() }

// Build the stable, deduped, buyer-excluded recipient list. Recomputed on every
// call so offset/limit batches tile the same underlying order with no gaps or
// double-sends, even after buyers and duplicate lead rows are removed.
async function buildRecipients(supabase: any) {
  const { data: customers, error: cErr } = await supabase
    .from('customers')
    .select('email')
  if (cErr) throw new Error(`customers: ${cErr.message}`)
  const buyers = new Set((customers ?? []).map((c: any) => norm(c.email)).filter(Boolean))

  const { data: leads, error: lErr } = await supabase
    .from('leads')
    .select('email, first_name, created_at')
    .not('email', 'is', null)
    .order('created_at', { ascending: true })
  if (lErr) throw new Error(`leads: ${lErr.message}`)

  const seen = new Set<string>()
  const recipients: { email: string; first_name: string | null }[] = []
  let duplicates = 0
  let excludedBuyers = 0
  for (const lead of leads ?? []) {
    const key = norm(lead.email)
    if (!key) continue
    if (seen.has(key)) { duplicates++; continue }
    seen.add(key)
    if (buyers.has(key)) { excludedBuyers++; continue }
    recipients.push({ email: lead.email, first_name: lead.first_name ?? null })
  }
  return { recipients, duplicates, excludedBuyers, buyerCount: buyers.size }
}

async function sendOne(resendKey: string, email: string, firstName: string | null) {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Harsha from SOLUM <no-reply@orders.bysolum.co.uk>',
      reply_to: 'harsha@bysolum.com',
      to: [email],
      subject: 'Free delivery on your SOLUM kit · first batch, going fast',
      html: buildFreeDeliveryEmail(firstName),
      headers: {
        'List-Unsubscribe': '<mailto:unsubscribe@bysolum.com>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }),
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return new Response(JSON.stringify({ error: 'RESEND_API_KEY not set' }), { status: 500 })

  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  // ── Mode: test_email — one copy of the real creative, ignore leads ──────────
  if (body.test_email) {
    try {
      const res = await sendOne(resendKey, String(body.test_email), body.first_name ?? null)
      const ok = res.ok
      const detail = ok ? undefined : await res.text()
      return json({ test: true, to: body.test_email, ok, detail })
    } catch (e) {
      return json({ test: true, to: body.test_email, ok: false, detail: String(e) }, 500)
    }
  }

  // ── Compute recipients (needed for dry_run and live send) ───────────────────
  let computed
  try {
    computed = await buildRecipients(supabase)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
  const { recipients, duplicates, excludedBuyers, buyerCount } = computed

  const limit = Number(body.limit ?? 30)

  // ── Mode: dry_run — counts + batch math + sample, send nothing ──────────────
  if (body.dry_run) {
    return json({
      dry_run: true,
      total_recipients: recipients.length,
      excluded_buyers: excludedBuyers,
      buyer_rows_in_customers: buyerCount,
      duplicates_removed: duplicates,
      batch_size: limit,
      batches: Math.ceil(recipients.length / limit),
      sample: recipients.slice(0, 5),
    })
  }

  // ── Mode: live batch send ───────────────────────────────────────────────────
  const offset = Number(body.offset ?? 0)
  const slice = recipients.slice(offset, offset + limit)
  const results = { offset, limit, total: slice.length, sent: 0, failed: 0, errors: [] as string[] }

  for (const r of slice) {
    try {
      const res = await sendOne(resendKey, r.email, r.first_name)
      if (res.ok) { results.sent++ } else {
        results.failed++
        results.errors.push(`${r.email}: ${await res.text()}`)
      }
    } catch (e) {
      results.failed++
      results.errors.push(`${r.email}: ${e}`)
    }
    await sleep(4000) // ~4s spacing, 30 emails ≈ 2 mins per batch
  }

  return json({ ...results, next_offset: offset + limit, remaining: Math.max(0, recipients.length - (offset + limit)) })
})
