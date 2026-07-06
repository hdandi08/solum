import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Unsubscribe endpoint. Handles both the RFC 8058 one-click POST (from email
// clients, via the List-Unsubscribe-Post header) and a plain browser GET (the
// visible footer link). Because the Supabase functions gateway forces
// text/plain on GET response bodies (so raw HTML would render as text), the
// browser GET does the DB update then 302-redirects to a branded static page on
// bysolum.co.uk. The one-click POST returns a bare 200 as the spec expects.
const CONFIRM_URL = 'https://bysolum.co.uk/unsubscribed.html'

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const token = url.searchParams.get('token')

  if (token) {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data } = await supabase.from('creators').select('id').eq('unsubscribe_token', token).limit(1)
    if (data?.[0]) {
      await supabase.from('creators')
        .update({ unsubscribed: true, sequence_status: 'stopped', updated_at: new Date().toISOString() })
        .eq('id', data[0].id)
    }
  }

  // One-click List-Unsubscribe POST: email clients expect a 2xx, not a redirect.
  if (req.method === 'POST') return new Response('ok', { status: 200 })

  // Browser click: redirect to the branded confirmation page (renders as real HTML).
  return new Response(null, { status: 302, headers: { Location: CONFIRM_URL } })
})
