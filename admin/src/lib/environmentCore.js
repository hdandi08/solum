export function resolveExactEnvironment(rawEnv, name, definition) {
  if (!rawEnv.VITE_SUPABASE_URL) {
    throw new Error('VITE_SUPABASE_URL is required.')
  }
  if (!rawEnv.VITE_SUPABASE_ANON_KEY) {
    throw new Error('VITE_SUPABASE_ANON_KEY is required.')
  }

  let url
  try {
    url = new URL(rawEnv.VITE_SUPABASE_URL)
  } catch {
    throw new Error('VITE_SUPABASE_URL must be a valid HTTPS URL.')
  }

  const projectRef = url.hostname.split('.')[0]
  if (
    url.protocol !== 'https:'
    || url.hostname !== `${definition.projectRef}.supabase.co`
  ) {
    throw new Error('Admin environment does not match Supabase project.')
  }

  return Object.freeze({
    name,
    isProduction: name === 'production',
    supabaseUrl: url.origin,
    anonKey: rawEnv.VITE_SUPABASE_ANON_KEY,
    projectRef,
    allowedOrigin: definition.allowedOrigin,
  })
}
