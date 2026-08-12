const EXPECTED_REF = 'rodvvmfzkyjsqbufkjbc'
const projectRef = process.env.SUPABASE_PROJECT_REF
const workerSecret = process.env.AWIN_WORKER_SECRET

if (
  projectRef !== EXPECTED_REF || typeof workerSecret !== 'string' ||
  workerSecret.length < 32
) {
  throw new Error('BLOCKED: exact development worker verification environment is absent')
}

const response = await fetch(
  `https://${EXPECTED_REF}.supabase.co/functions/v1/awin-conversion-worker`,
  {
    method: 'POST',
    headers: {
      authorization: `Bearer ${workerSecret}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ limit: 1 }),
  },
)

if (!response.ok) throw new Error(`development worker verification failed (${response.status})`)
const counts = await response.json()
for (const key of ['claimed', 'sent', 'retried', 'dead_letter']) {
  if (!Number.isInteger(counts?.[key]) || counts[key] !== 0) {
    throw new Error('development worker verification was not empty')
  }
}

console.log(JSON.stringify({ authenticated: true, empty: true }))
