import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  assertAwinProfileFields,
  extractAwinProfileFields,
} from './verify-profile-copy.mjs'

const profilePath = new URL('../../artefacts/SOLUM-awin-profile-copy.txt', import.meta.url)

test('the published AWIN profile fields fit their stated limits and retain the fixed programme facts', async () => {
  const fields = extractAwinProfileFields(await readFile(profilePath, 'utf8'))
  assert.doesNotThrow(() => assertAwinProfileFields(fields))
  assert.ok(fields.recommended.length <= 255)
  assert.ok(fields.alternate.length <= 255)
  assert.ok(fields.full.length <= 2000)
})

test('rejects an AWIN full description above the 2,000-character limit', () => {
  assert.throws(
    () => assertAwinProfileFields({
      recommended: 'GROUND and RITUAL kits.',
      alternate: 'One-time body-care kits.',
      full: 'x'.repeat(2001),
    }),
    /2,000/i,
  )
})
