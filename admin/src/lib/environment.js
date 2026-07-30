import { resolveExactEnvironment } from './environmentCore'

const name = import.meta.env.VITE_ADMIN_ENV
if (name !== 'production' && name !== 'development') {
  throw new Error('VITE_ADMIN_ENV must be production or development.')
}

export const adminEnvironment = resolveExactEnvironment(
  import.meta.env,
  name,
  {
    projectRef: __ADMIN_PROJECT_REF__,
    allowedOrigin: __ADMIN_ALLOWED_ORIGIN__,
  },
)
