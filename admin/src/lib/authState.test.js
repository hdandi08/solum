import { describe, expect, it } from 'vitest'
import {
  isValidMfaCode,
  resolveAdminAuthStep,
} from './authState'

const adminSession = {
  user: {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'harsha@bysolum.com',
    app_metadata: { role: 'admin' },
  },
}

describe('resolveAdminAuthStep', () => {
  it('waits until the session is resolved', () => {
    expect(resolveAdminAuthStep({
      session: undefined,
      aal: undefined,
      factors: undefined,
    })).toBe('loading')
  })

  it('requires sign-in after a resolved empty session', () => {
    expect(resolveAdminAuthStep({
      session: null,
      aal: null,
      factors: [],
    })).toBe('signed_out')
  })

  it('rejects authenticated users without the protected admin role', () => {
    expect(resolveAdminAuthStep({
      session: {
        user: {
          app_metadata: { role: 'customer' },
        },
      },
      aal: 'aal1',
      factors: [],
    })).toBe('forbidden')
  })

  it('requires TOTP enrolment when no verified factor exists', () => {
    expect(resolveAdminAuthStep({
      session: adminSession,
      aal: 'aal1',
      factors: [{
        factor_type: 'totp',
        status: 'unverified',
      }],
    })).toBe('enrol_mfa')
  })

  it('requires a challenge for a verified factor at aal1', () => {
    expect(resolveAdminAuthStep({
      session: adminSession,
      aal: 'aal1',
      factors: [{
        factor_type: 'totp',
        status: 'verified',
      }],
    })).toBe('challenge_mfa')
  })

  it('allows an admin with a verified factor at aal2', () => {
    expect(resolveAdminAuthStep({
      session: adminSession,
      aal: 'aal2',
      factors: [{
        factor_type: 'totp',
        status: 'verified',
      }],
    })).toBe('ready')
  })
})

describe('isValidMfaCode', () => {
  it('accepts exactly six numeric digits', () => {
    expect(isValidMfaCode('012345')).toBe(true)
    expect(isValidMfaCode('12345')).toBe(false)
    expect(isValidMfaCode('1234567')).toBe(false)
    expect(isValidMfaCode('123 456')).toBe(false)
    expect(isValidMfaCode('12345a')).toBe(false)
  })
})
