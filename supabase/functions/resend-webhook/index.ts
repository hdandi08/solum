import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Verify a Svix-signed webhook (Resend uses Svix). Secret form: "whsec_<base64>".
async function verify(secret: string, id: string, ts: string, payload: string, header: string) {
  const key = Uint8Array.from(atob(secret.replace(/^whsec_/, '')), c => c.charCodeAt(0))
  const mac = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', mac, new TextEncoder().encode(`${id}.${ts}.${payload}`))
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)))
  // header is space-separated "v1,<sig>" entries
  return header.split(' ').some(part => part.split(',')[1] === expected)
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method', { status: 405 })
  const secret = Deno.env.get('RESEND_WEBHOOK_SECRET')
  if (!secret) return new Response('no secret', { status: 500 })

  const payload = await req.text()
  const id = req.headers.get('svix-id') ?? ''
  const ts = req.headers.get('svix-timestamp') ?? ''
  const sigHeader = req.headers.get('svix-signature') ?? ''
  if (!(await verify(secret, id, ts, payload, sigHeader))) return new Response('bad signature', { status: 401 })

  const evt = JSON.parse(payload)
  const type: string = evt.type ?? ''
  const emailId: string | undefined = evt.data?.email_id ?? evt.data?.id
  if (!emailId) return new Response('ok', { status: 200 })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const nowIso = new Date().toISOString()

  const { data: rows } = await supabase.from('creator_emails').select('*').eq('resend_id', emailId).limit(1)
  const row = rows?.[0]
  if (!row) return new Response('ok', { status: 200 })

  const patch: Record<string, unknown> = {}
  if (type === 'email.delivered') patch.delivered_at = row.delivered_at ?? nowIso
  if (type === 'email.opened')  { patch.opened_at = row.opened_at ?? nowIso; patch.open_count = (row.open_count ?? 0) + 1 }
  if (type === 'email.clicked') { patch.clicked_at = row.clicked_at ?? nowIso; patch.click_count = (row.click_count ?? 0) + 1 }
  if (type === 'email.bounced' || type === 'email.complained') patch.bounced_at = row.bounced_at ?? nowIso
  if (Object.keys(patch).length) await supabase.from('creator_emails').update(patch).eq('id', row.id)

  if (type === 'email.bounced' || type === 'email.complained') {
    await supabase.from('creators').update({ unsubscribed: true, sequence_status: 'stopped', updated_at: nowIso }).eq('id', row.creator_id)
  }
  return new Response('ok', { status: 200 })
})
