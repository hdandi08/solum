import { createClient } from '@supabase/supabase-js'
import { resolveAdminEnvironment } from './environment'

export const adminEnvironment = resolveAdminEnvironment(import.meta.env)

export const supabase = createClient(
  adminEnvironment.supabaseUrl,
  adminEnvironment.anonKey,
  {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
)
