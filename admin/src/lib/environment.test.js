import { describe, expect, it } from 'vitest'
import { resolveAdminEnvironment } from './environmentValidation'

const productionEnv = {
  VITE_ADMIN_ENV: 'production',
  VITE_SUPABASE_URL: 'https://gvfptmjluxpngfjendbi.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'public-anon-key',
}

const developmentEnv = {
  VITE_ADMIN_ENV: 'development',
  VITE_SUPABASE_URL: 'https://rodvvmfzkyjsqbufkjbc.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'public-anon-key',
}

describe('resolveAdminEnvironment', () => {
  it('accepts the exact production project and origin', () => {
    expect(resolveAdminEnvironment(productionEnv)).toEqual({
      name: 'production',
      isProduction: true,
      supabaseUrl: 'https://gvfptmjluxpngfjendbi.supabase.co',
      anonKey: 'public-anon-key',
      projectRef: 'gvfptmjluxpngfjendbi',
      allowedOrigin: 'https://admin.bysolum.co.uk',
    })
  })

  it('accepts the exact development project and origin', () => {
    expect(resolveAdminEnvironment(developmentEnv)).toEqual({
      name: 'development',
      isProduction: false,
      supabaseUrl: 'https://rodvvmfzkyjsqbufkjbc.supabase.co',
      anonKey: 'public-anon-key',
      projectRef: 'rodvvmfzkyjsqbufkjbc',
      allowedOrigin: 'https://admin-dev.bysolum.co.uk',
    })
  })

  it('rejects a production label paired with the development project', () => {
    expect(() => resolveAdminEnvironment({
      ...productionEnv,
      VITE_SUPABASE_URL: developmentEnv.VITE_SUPABASE_URL,
    })).toThrow(/environment does not match Supabase project/i)
  })

  it('rejects missing and unknown environment labels', () => {
    expect(() => resolveAdminEnvironment({})).toThrow(/VITE_ADMIN_ENV/)
    expect(() => resolveAdminEnvironment({
      ...productionEnv,
      VITE_ADMIN_ENV: 'staging',
    })).toThrow(/production or development/)
  })

  it('rejects missing public Supabase configuration', () => {
    expect(() => resolveAdminEnvironment({
      ...developmentEnv,
      VITE_SUPABASE_URL: '',
    })).toThrow(/VITE_SUPABASE_URL/)
    expect(() => resolveAdminEnvironment({
      ...developmentEnv,
      VITE_SUPABASE_ANON_KEY: '',
    })).toThrow(/VITE_SUPABASE_ANON_KEY/)
  })

  it('rejects non-HTTPS and malformed Supabase URLs', () => {
    expect(() => resolveAdminEnvironment({
      ...developmentEnv,
      VITE_SUPABASE_URL: 'http://rodvvmfzkyjsqbufkjbc.supabase.co',
    })).toThrow(/environment does not match Supabase project/i)
    expect(() => resolveAdminEnvironment({
      ...developmentEnv,
      VITE_SUPABASE_URL: 'not-a-url',
    })).toThrow(/valid HTTPS URL/i)
  })
})
