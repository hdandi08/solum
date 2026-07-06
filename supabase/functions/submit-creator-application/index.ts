import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildCreatorEmail } from '../_shared/creatorEmails.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const FROM = 'SOLUM Creators <hello@creators.bysolum.com>'
const REPLY_TO = 'contact@bysolum.com'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
function clean(v: unknown): string | null {
  const s = (v ?? '').toString().trim()
  return s ? s : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const b = await req.json().catch(() => ({}))
    const email = (b.email ?? '').toString().trim().toLowerCase()
    const name = clean(b.name)
    const instagram = clean(b.instagram_handle)
    const portfolio = clean(b.portfolio_url)
    const followerRaw = (b.follower_count ?? '').toString().replace(/[,\s]/g, '')
    const niche = clean(b.niche)

    if (!name || !email || !EMAIL_RE.test(email) || !instagram || !portfolio || !/^\d+$/.test(followerRaw) || !niche) {
      return json({ ok: false, error: 'Please complete all required fields.' }, 400)
    }

    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const fields = {
      name,
      instagram_handle: instagram,
      tiktok_handle: clean(b.tiktok_handle),
      portfolio_url: portfolio,
      follower_count: Number(followerRaw),
      niches: [niche],
      deal_types: Array.isArray(b.deal_types) ? b.deal_types : [],
      notes: clean(b.notes),
      stage: 'applied',
      sequence_status: 'stopped',
      updated_at: new Date().toISOString(),
    }

    // Reconcile by case-insensitive email (unique index is on lower(email)).
    const { data: existing } = await db.from('creators').select('id, unsubscribe_token').ilike('email', email).limit(1)
    let unsubToken: string | null = null
    if (existing && existing[0]) {
      const { error } = await db.from('creators').update(fields).eq('id', existing[0].id)
      if (error) throw error
      unsubToken = existing[0].unsubscribe_token
    } else {
      const { data: ins, error } = await db.from('creators')
        .insert({ email, sequence_step: 0, next_email_at: null, source: 'inbound', ...fields })
        .select('unsubscribe_token').single()
      if (error) throw error
      unsubToken = ins?.unsubscribe_token ?? null
    }

    // Confirmation email (do not fail the submit if this errors).
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (resendKey && unsubToken) {
      const { subject, html } = buildCreatorEmail('application_received', { name, unsubscribe_token: unsubToken })
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: FROM, reply_to: REPLY_TO, to: [email], subject, html }),
        })
        if (!res.ok) console.error('confirmation email failed', await res.text())
      } catch (e) { console.error('confirmation email error', e) }
    }

    return json({ ok: true })
  } catch (err) {
    console.error(err)
    return json({ ok: false, error: 'Something went wrong. Please try again.' }, 500)
  }
})
