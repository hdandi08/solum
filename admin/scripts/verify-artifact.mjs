import {
  readdir,
  readFile,
} from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import {
  extname,
  relative,
  resolve,
  sep,
} from 'node:path'

const PROJECTS = Object.freeze({
  development: 'rodvvmfzkyjsqbufkjbc',
  production: 'gvfptmjluxpngfjendbi',
})

const TEXT_EXTENSIONS = new Set([
  '.cjs',
  '.css',
  '.html',
  '.js',
  '.json',
  '.map',
  '.mjs',
  '.svg',
  '.txt',
  '.webmanifest',
  '.xml',
])

const FORBIDDEN = [
  {
    category: 'privileged credential marker',
    patterns: [
      /service[_-]?role/i,
      /VITE_SUPABASE_SERVICE_ROLE_KEY/i,
    ],
  },
  {
    category: 'tracker marker',
    patterns: [
      /posthog/i,
      /\bphc_[a-z0-9_]+/i,
      /connect\.facebook\.net\/[^"']*fbevents/i,
      /\bfbq\s*\(/i,
      /analytics\.tiktok\.com/i,
      /\bttq\s*\./i,
      /googletagmanager\.com\/gtag\/js/i,
      /googleadservices\.com/i,
      /\bAW-[0-9]+\b/i,
      /(?:www\.)?dwin1\.com/i,
      /(?:www\.)?awin1\.com/i,
      /\bAWIN\.Tracking\b/i,
    ],
  },
]

function artifactPath(root, file) {
  return relative(root, file).split(sep).join('/')
}

async function textFiles(root) {
  const files = []

  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true })
    entries.sort((left, right) => left.name.localeCompare(right.name))
    for (const entry of entries) {
      const path = resolve(directory, entry.name)
      if (entry.isDirectory()) {
        await walk(path)
      } else if (
        entry.isFile()
        && TEXT_EXTENSIONS.has(extname(entry.name).toLowerCase())
      ) {
        files.push(path)
      }
    }
  }

  await walk(root)
  return files
}

export async function verifyArtifact({ root, environment }) {
  const expectedProject = PROJECTS[environment]
  if (!expectedProject) {
    throw new Error(
      'Artifact environment must be development or production.',
    )
  }
  const otherEnvironment = environment === 'production'
    ? 'development'
    : 'production'
  const forbiddenProject = PROJECTS[otherEnvironment]
  const files = await textFiles(root)
  let expectedProjectFound = false

  for (const file of files) {
    const content = await readFile(file, 'utf8')
    const path = artifactPath(root, file)
    if (content.includes(expectedProject)) expectedProjectFound = true
    if (content.includes(forbiddenProject)) {
      throw new Error(`environment mismatch in ${path}`)
    }
    for (const check of FORBIDDEN) {
      if (check.patterns.some(pattern => pattern.test(content))) {
        throw new Error(`${check.category} in ${path}`)
      }
    }
  }

  if (!expectedProjectFound) {
    throw new Error(
      `expected ${environment} project reference was not found`,
    )
  }

  return {
    environment,
    scannedFiles: files.length,
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : ''
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const result = await verifyArtifact({
      root: resolve(process.cwd(), 'dist'),
      environment: process.argv[2],
    })
    console.log(
      `Admin artifact verified for ${result.environment} (${result.scannedFiles} text files).`,
    )
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : 'Artifact verification failed.',
    )
    process.exitCode = 1
  }
}
