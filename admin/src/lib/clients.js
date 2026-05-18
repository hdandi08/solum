import { createClient } from '@supabase/supabase-js'

const SERVICE_CONFIG = {
  auth: { autoRefreshToken: false, persistSession: false },
}

export const prodClient = createClient(
  import.meta.env.VITE_SUPABASE_URL_PROD,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY_PROD,
  SERVICE_CONFIG,
)

export const devClient = createClient(
  import.meta.env.VITE_SUPABASE_URL_DEV,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY_DEV,
  SERVICE_CONFIG,
)

export const ENV_CONFIGS = {
  prod: {
    label: 'PROD',
    url: import.meta.env.VITE_SUPABASE_URL_PROD,
    client: prodClient,
  },
  dev: {
    label: 'DEV',
    url: import.meta.env.VITE_SUPABASE_URL_DEV,
    client: devClient,
  },
}
