import { createClient } from '@supabase/supabase-js'

const SERVICE_CONFIG = {
  auth: { autoRefreshToken: false, persistSession: false },
}

// Service role clients — used for all data queries (bypasses RLS)
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

// Anon key clients — used only for auth operations (signIn, getSession, signOut)
export const authProdClient = createClient(
  import.meta.env.VITE_SUPABASE_URL_PROD,
  import.meta.env.VITE_SUPABASE_ANON_KEY_PROD,
)

export const authDevClient = createClient(
  import.meta.env.VITE_SUPABASE_URL_DEV,
  import.meta.env.VITE_SUPABASE_ANON_KEY_DEV,
)

export const ENV_CONFIGS = {
  prod: {
    label: 'PROD',
    url: import.meta.env.VITE_SUPABASE_URL_PROD,
    client: prodClient,
    authClient: authProdClient,
  },
  dev: {
    label: 'DEV',
    url: import.meta.env.VITE_SUPABASE_URL_DEV,
    client: devClient,
    authClient: authDevClient,
  },
}
