import { resolveExactEnvironment } from './environmentCore'

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
  return resolveExactEnvironment(rawEnv, name, definition)
}
