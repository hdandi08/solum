import { access, readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const REPOSITORY_ROOT = new URL('../../', import.meta.url)
const RETIRED_FUNCTIONS = [
  'admin-adjust-stock',
  'admin-confirm-delivery',
  'admin-supplier-order',
  'set-test-stock',
]

describe('retired Edge Function deployment surface', () => {
  it.each(RETIRED_FUNCTIONS)('does not ship %s source', async (functionName) => {
    const entrypoint = new URL(
      `supabase/functions/${functionName}/index.ts`,
      REPOSITORY_ROOT,
    )

    await expect(access(entrypoint)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it.each(RETIRED_FUNCTIONS)('does not deploy %s from the Makefile', async (functionName) => {
    const makefile = await readFile(new URL('Makefile', REPOSITORY_ROOT), 'utf8')

    expect(makefile).not.toContain(functionName)
  })
})
