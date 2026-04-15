// supabase/functions/submit-founding-job/index.ts
// Authenticated — records a member's job completion and updates their participation score.
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

  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

  const email = user.email!.trim().toLowerCase();
  const { job_id, responses } = await req.json();

  if (!job_id || !responses) {
    return new Response(JSON.stringify({ ok: false, error: 'job_id and responses required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Verify the job exists and is open
  const { data: job } = await supabase
    .from('founding_jobs')
    .select('id, points, closes_at')
    .eq('id', job_id)
    .maybeSingle();

  if (!job) {
    return new Response(JSON.stringify({ ok: false, error: 'Job not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (job.closes_at && new Date(job.closes_at) < new Date()) {
    return new Response(JSON.stringify({ ok: false, error: 'This job is closed' }), {
      status: 410,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const now = new Date().toISOString();

  // Insert completion (UNIQUE constraint prevents duplicates)
  const { error: insertError } = await supabase
    .from('founding_job_completions')
    .insert({ email, job_id, responses, points_earned: job.points });

  if (insertError) {
    // 23505 = unique_violation — already submitted
    if (insertError.code === '23505') {
      return new Response(JSON.stringify({ ok: false, error: 'Already submitted' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ ok: false, error: insertError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Update participation counters on the lead
  await supabase.rpc('increment_founding_sessions', { p_email: email, p_now: now });

  return new Response(JSON.stringify({ ok: true, points_earned: job.points }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
