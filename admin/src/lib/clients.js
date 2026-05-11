import { createClient } from '@supabase/supabase-js'

const AUTH_CONFIG = {
  auth: { flowType: 'implicit', detectSessionInUrl: true },
}

export const prodClient = createClient(
  import.meta.env.VITE_SUPABASE_URL_PROD,
  import.meta.env.VITE_SUPABASE_ANON_KEY_PROD,
  AUTH_CONFIG,
)

export const devClient = createClient(
  import.meta.env.VITE_SUPABASE_URL_DEV,
  import.meta.env.VITE_SUPABASE_ANON_KEY_DEV,
  AUTH_CONFIG,
)

export const ENV_CONFIGS = {
  prod: {
    label: 'PROD',
    url: import.meta.env.VITE_SUPABASE_URL_PROD,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY_PROD,
    client: prodClient,
  },
  dev: {
    label: 'DEV',
    url: import.meta.env.VITE_SUPABASE_URL_DEV,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY_DEV,
    client: devClient,
  },
}
