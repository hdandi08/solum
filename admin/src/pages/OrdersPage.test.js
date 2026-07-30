import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./OrdersPage.jsx', import.meta.url), 'utf8')

describe('OrdersPage admin boundary', () => {
  it('uses the authenticated admin API without direct database access', () => {
    expect(source).toContain("from '../lib/adminClient'")
    expect(source).not.toMatch(/\b(?:client|supabase)\s*\.\s*from\s*\(/)
    expect(source).not.toContain('EnvContext')
    expect(source).not.toContain('CustomerPanel')
  })
})
