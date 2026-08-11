const AWIN_FEED_HEADER = [
  'product_id', 'product_name', 'description', 'merchant_image_url',
  'search_price', 'currency', 'merchant_deep_link', 'in_stock',
  'brand_name', 'merchant_category', 'delivery_cost',
]

const EXPECTED_KITS = {
  ground: { search_price: '65.00', currency: 'GBP', brand_name: 'SOLUM', delivery_cost: '0.00' },
  ritual: { search_price: '85.00', currency: 'GBP', brand_name: 'SOLUM', delivery_cost: '0.00' },
}

function parseCsv(text) {
  if (typeof text !== 'string' || text.trim() === '') throw new Error('AWIN feed is empty')

  const rows = []
  let row = []
  let field = ''
  let quoted = false
  let quoteClosed = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"'
          index += 1
        } else {
          quoted = false
          quoteClosed = true
        }
      } else {
        field += character
      }
      continue
    }

    if (character === '"') {
      if (field !== '' || quoteClosed) throw new Error('AWIN feed CSV quoting is invalid')
      quoted = true
    } else if (character === ',') {
      row.push(field)
      field = ''
      quoteClosed = false
    } else if (character === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      quoteClosed = false
    } else if (character !== '\r') {
      if (quoteClosed) throw new Error('AWIN feed CSV quoting is invalid')
      field += character
    }
  }

  if (quoted) throw new Error('AWIN feed CSV quoting is invalid')
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

function requireNonEmptyFields(row) {
  if (row.some((value) => value.trim() === '')) throw new Error('AWIN feed has missing content')
}

export function assertAwinFeedResponse(text, contentType) {
  if (typeof contentType !== 'string' || !contentType.toLowerCase().includes('text/csv')) {
    throw new Error('AWIN feed is not CSV')
  }

  const rows = parseCsv(text)
  const [header, ...kits] = rows
  if (header.length !== AWIN_FEED_HEADER.length || header.some((value, index) => value !== AWIN_FEED_HEADER[index])) {
    throw new Error('AWIN feed header is invalid')
  }
  if (kits.length !== 2) throw new Error('AWIN feed must contain exactly two rows')

  const seen = new Set()
  for (const row of kits) {
    if (row.length !== AWIN_FEED_HEADER.length) throw new Error('AWIN feed row has invalid columns')
    requireNonEmptyFields(row)
    const kit = Object.fromEntries(AWIN_FEED_HEADER.map((column, index) => [column, row[index]]))
    if (seen.has(kit.product_id)) throw new Error('AWIN feed contains duplicate kit rows')
    seen.add(kit.product_id)
    if (!Object.hasOwn(EXPECTED_KITS, kit.product_id)) throw new Error('AWIN feed has an unexpected kit row')
    if (kit.in_stock !== '0' && kit.in_stock !== '1') throw new Error('AWIN feed stock must be 0 or 1')

    for (const [field, expected] of Object.entries(EXPECTED_KITS[kit.product_id])) {
      if (kit[field] !== expected) throw new Error(`AWIN feed ${field} is invalid for ${kit.product_id}`)
    }
  }

  if (!seen.has('ground') || !seen.has('ritual')) throw new Error('AWIN feed rows must include ground and ritual')
}

export async function verifyAwinFeedUrl(origin, fetchImpl = fetch) {
  if (typeof origin !== 'string' || origin.trim() === '') throw new Error('AWIN feed origin is required')
  const url = `${origin.replace(/\/+$/, '')}/feeds/awin.csv`
  const response = await fetchImpl(url)
  if (!response?.ok) throw new Error('AWIN feed request failed')
  const contentType = response.headers?.get('content-type')
  const text = await response.text()
  assertAwinFeedResponse(text, contentType)
}

export async function main({ origin = process.env.AWIN_FEED_ORIGIN, fetchImpl = fetch, report = console.log } = {}) {
  await verifyAwinFeedUrl(origin, fetchImpl)
  report('AWIN feed verified')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(() => {
    console.error('AWIN feed verification failed')
    process.exitCode = 1
  })
}
