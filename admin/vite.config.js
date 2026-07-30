import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const DEFINITIONS = {
  production: {
    projectRef: 'gvfptmjluxpngfjendbi',
    allowedOrigin: 'https://admin.bysolum.co.uk',
  },
  development: {
    projectRef: 'rodvvmfzkyjsqbufkjbc',
    allowedOrigin: 'https://admin-dev.bysolum.co.uk',
  },
}

export default defineConfig(({ mode }) => {
  const loaded = loadEnv(mode, process.cwd(), 'VITE_')
  const name = process.env.VITE_ADMIN_ENV || loaded.VITE_ADMIN_ENV
  const definition = DEFINITIONS[name]
  if (!definition) {
    throw new Error('VITE_ADMIN_ENV must be production or development.')
  }

  return {
    define: {
      __ADMIN_PROJECT_REF__: JSON.stringify(definition.projectRef),
      __ADMIN_ALLOWED_ORIGIN__: JSON.stringify(definition.allowedOrigin),
    },
    plugins: [react()],
    server: {
      port: 5174,
      strictPort: true,
    },
  }
})
