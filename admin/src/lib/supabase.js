import { createClient } from '@supabase/supabase-js'
import { adminEnvironment } from './environment'

export { adminEnvironment }

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
