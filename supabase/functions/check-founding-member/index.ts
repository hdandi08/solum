// supabase/functions/check-founding-member/index.ts
// Public — checks if an email is an active founding member before sending magic link.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const { email } = await req.json();
  if (!email) {
    return new Response(JSON.stringify({ is_member: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Allow both confirmed founding members AND invited-but-not-yet-pledged people.
  // is_founding_member is only set true AFTER the pledge is signed.
  const { data } = await supabase
    .from('customers')
    .select('id')
    .eq('email', email.trim().toLowerCase())
    .or('is_founding_member.eq.true,founding_invited_at.not.is.null')
    .is('exit_at', null)
    .maybeSingle();

  return new Response(JSON.stringify({ is_member: !!data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
