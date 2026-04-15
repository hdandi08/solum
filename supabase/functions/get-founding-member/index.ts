// supabase/functions/get-founding-member/index.ts
// Authenticated — returns member record, all jobs, and their completions.
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

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

  // Verify JWT and get auth user
  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

  const email = user.email!.trim().toLowerCase();

  // Try fast lookup by supabase_user_id first
  let { data: customer } = await supabase
    .from('customers')
    .select('id, email, first_name, last_name, founding_member_since, pledge_signed_at, sessions_completed, last_session_at, exit_at, supabase_user_id')
    .eq('supabase_user_id', user.id)
    .eq('is_founding_member', true)
    .maybeSingle();

  // First login: find by email and link supabase_user_id
  if (!customer) {
    const { data } = await supabase
      .from('customers')
      .select('id, email, first_name, last_name, founding_member_since, pledge_signed_at, sessions_completed, last_session_at, exit_at, supabase_user_id')
      .eq('email', email)
      .eq('is_founding_member', true)
      .is('exit_at', null)
      .maybeSingle();
    customer = data;

    if (customer && !customer.supabase_user_id) {
      await supabase
        .from('customers')
        .update({ supabase_user_id: user.id, updated_at: new Date().toISOString() })
        .eq('id', customer.id)
        .is('supabase_user_id', null);
    }
  }

  if (!customer) {
    return new Response(JSON.stringify({ member: null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Load all open jobs + this member's completions in parallel
  const [{ data: jobs }, { data: completions }] = await Promise.all([
    supabase
      .from('founding_jobs')
      .select('id, title, description, type, points, opens_at, closes_at, schema')
      .lte('opens_at', new Date().toISOString())
      .order('opens_at', { ascending: true }),
    supabase
      .from('founding_job_completions')
      .select('job_id, responses, points_earned, submitted_at')
      .eq('email', email),
  ]);

  return new Response(JSON.stringify({
    member: {
      id:                    customer.id,
      email:                 customer.email,
      first_name:            customer.first_name,
      last_name:             customer.last_name,
      founding_member_since: customer.founding_member_since,
      pledge_signed_at:      customer.pledge_signed_at,
      sessions_completed:    customer.sessions_completed,
      is_active:             !customer.exit_at,
    },
    jobs:        jobs ?? [],
    completions: completions ?? [],
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
