import {
  afterEach,
  describe,
  expect,
  it,
} from 'vitest'
import {
  mkdir,
  mkdtemp,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { verifyArtifact } from './verify-artifact.mjs'

const DEV_REF = 'rodvvmfzkyjsqbufkjbc'
const PROD_REF = 'gvfptmjluxpngfjendbi'
const fixtures = []

async function artifact(files) {
  const root = await mkdtemp(join(tmpdir(), 'solum-admin-artifact-'))
  fixtures.push(root)
  for (const [path, content] of Object.entries(files)) {
    const target = join(root, path)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, content)
  }
  return root
}

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map(root =>
    rm(root, { recursive: true, force: true })))
})

describe('verifyArtifact', () => {
  it.each([
    ['service_role'],
    ['VITE_SUPABASE_SERVICE_ROLE_KEY'],
  ])('rejects privileged marker %s', async (marker) => {
    const root = await artifact({
      'assets/app.js': `${DEV_REF}\n${marker}=not-a-real-secret`,
    })

    await expect(verifyArtifact({
      root,
      environment: 'development',
    })).rejects.toThrow(/privileged credential.*assets\/app\.js/i)
  })

  it('rejects the production project in a development artifact', async () => {
    const root = await artifact({
      'assets/app.js': PROD_REF,
    })

    await expect(verifyArtifact({
      root,
      environment: 'development',
    })).rejects.toThrow(/environment mismatch.*assets\/app\.js/i)
  })

  it('rejects the development project in a production artifact', async () => {
    const root = await artifact({
      'assets/app.js': DEV_REF,
    })

    await expect(verifyArtifact({
      root,
      environment: 'production',
    })).rejects.toThrow(/environment mismatch.*assets\/app\.js/i)
  })

  it.each([
    ['PostHog', 'posthog.init("phc_test")'],
    ['Meta Pixel', 'connect.facebook.net/en_US/fbevents.js'],
    ['TikTok', 'analytics.tiktok.com/i18n/pixel/events.js'],
    ['Google Ads', 'googletagmanager.com/gtag/js?id=AW-123'],
    ['Awin', 'www.dwin1.com/129171.js'],
  ])('rejects the %s tracker', async (_name, marker) => {
    const root = await artifact({
      'index.html': DEV_REF,
      'assets/tracker.js': marker,
    })

    await expect(verifyArtifact({
      root,
      environment: 'development',
    })).rejects.toThrow(/tracker marker.*assets\/tracker\.js/i)
  })

  it('accepts an artifact containing only its expected project', async () => {
    const root = await artifact({
      'index.html': '<main>SOLUM Admin</main>',
      'assets/app.js': `const project = "${DEV_REF}"`,
      'fonts/brand.woff2': new Uint8Array([0, 1, 2, 3]),
    })

    await expect(verifyArtifact({
      root,
      environment: 'development',
    })).resolves.toEqual({
      environment: 'development',
      scannedFiles: 2,
    })
  })
})
