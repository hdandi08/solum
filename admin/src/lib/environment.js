import { resolveExactEnvironment } from './environmentCore'

const name = import.meta.env.VITE_ADMIN_ENV
if (name !== 'production' && name !== 'development') {
  throw new Error('VITE_ADMIN_ENV must be production or development.')
}

export const adminEnvironment = resolveExactEnvironment(
  {
    VITE_ADMIN_ENV: name,
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  },
  name,
  {
    projectRef: __ADMIN_PROJECT_REF__,
    allowedOrigin: __ADMIN_ALLOWED_ORIGIN__,
  },
)
