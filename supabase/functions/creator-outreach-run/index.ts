import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { dueStep, computeAfterSend } from '../_shared/sequence.mjs'
import { buildCreatorEmail } from '../_shared/creatorEmails.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const FROM = 'SOLUM Creators <hello@creators.bysolum.com>'
const REPLY_TO = 'contact@bysolum.com'
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return new Response(JSON.stringify({ error: 'RESEND_API_KEY not set' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const now = new Date()

  const { data: creators, error } = await supabase
    .from('creators')
    .select('*')
    .eq('sequence_status', 'active')
    .eq('unsubscribed', false)
    .not('stage', 'in', '(in_talks,active,declined,archived)')
    .or(`next_email_at.is.null,next_email_at.lte.${now.toISOString()}`)
    .order('created_at', { ascending: true })
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: cors })

  const res = { processed: 0, sent: 0, failed: 0, errors: [] as string[] }
  for (const c of creators ?? []) {
    const due = dueStep(c, now)
    if (!due) continue
    res.processed++
    const { subject, html } = buildCreatorEmail(due.key as any, { name: c.name, unsubscribe_token: c.unsubscribe_token })
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM, reply_to: REPLY_TO, to: [c.email], subject, html,
          headers: {
            'List-Unsubscribe': `<https://gvfptmjluxpngfjendbi.supabase.co/functions/v1/creator-unsubscribe?token=${c.unsubscribe_token}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        }),
      })
      if (!r.ok) {
        res.failed++; res.errors.push(`${c.email}: ${await r.text()}`)
      } else {
        const body = await r.json().catch(() => ({}))
        // Log the send, then advance the creator (only after a successful send).
        const { error: logErr } = await supabase.from('creator_emails').insert({
          creator_id: c.id, step: due.step, template_key: due.key, subject,
          resend_id: body.id ?? null, sent_at: now.toISOString(),
        })
        const after = computeAfterSend(due.step, c.created_at)
        const { error: updErr } = await supabase.from('creators').update({
          sequence_step: due.step, ...after, updated_at: now.toISOString(),
        }).eq('id', c.id)
        if (logErr) res.errors.push(`${c.email}: advance-failed: ${logErr.message}`)
        if (updErr) res.errors.push(`${c.email}: advance-failed: ${updErr.message}`)
        res.sent++
      }
    } catch (e) {
      res.failed++; res.errors.push(`${c.email}: ${e}`)
    }
    await sleep(4000)
  }
  return new Response(JSON.stringify(res), { headers: { ...cors, 'Content-Type': 'application/json' } })
})
