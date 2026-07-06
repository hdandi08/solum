import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  const page = (msg: string) =>
    new Response(`<!doctype html><meta charset="utf-8"><body style="background:#08090B;color:#F0ECE2;font-family:Helvetica,Arial,sans-serif;text-align:center;padding:60px 24px;"><p style="font-size:16px;">${msg}</p><p style="font-size:12px;color:#4A8FC7;letter-spacing:2px;">SOLUM</p></body>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } })

  if (!token) return page('Invalid unsubscribe link.')
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data } = await supabase.from('creators').select('id').eq('unsubscribe_token', token).limit(1)
  if (!data?.[0]) return page('This link is no longer valid.')
  await supabase.from('creators').update({ unsubscribed: true, sequence_status: 'stopped', updated_at: new Date().toISOString() }).eq('id', data[0].id)
  return page('You are unsubscribed. You will not receive further emails from SOLUM creators.')
})
