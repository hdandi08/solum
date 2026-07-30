const DEFINITIONS = Object.freeze({
  production: Object.freeze({
    projectRef: 'gvfptmjluxpngfjendbi',
    allowedOrigin: 'https://admin.bysolum.co.uk',
  }),
  development: Object.freeze({
    projectRef: 'rodvvmfzkyjsqbufkjbc',
    allowedOrigin: 'https://admin-dev.bysolum.co.uk',
  }),
})

export function resolveAdminEnvironment(rawEnv) {
  const name = rawEnv?.VITE_ADMIN_ENV
  const definition = DEFINITIONS[name]

  if (!definition) {
    throw new Error('VITE_ADMIN_ENV must be production or development.')
  }
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
