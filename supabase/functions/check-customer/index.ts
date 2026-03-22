// supabase/functions/check-customer/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Gate behind anon key — prevents unauthenticated email enumeration
  const apiKey = req.headers.get('apikey') ?? req.headers.get('Authorization')?.replace('Bearer ', '');
  if (apiKey !== ANON_KEY) {
    return new Response('Forbidden', { status: 403, headers: corsHeaders });
  }

  const { email } = await req.json();
  if (!email) {
    return new Response(JSON.stringify({ exists: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data } = await supabase
    .from('customers')
    .select('id')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  return new Response(JSON.stringify({ exists: !!data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
