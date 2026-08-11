const REQUIRED_TERMS = [
  'Commission: 5% standard commission on valid sales, with selected partner-specific arrangements agreed individually.',
  'Attribution period: 30 days.',
  'Products: one-time GROUND (£65) and RITUAL (£85) kits.',
  'Delivery: free standard UK delivery while the current launch promotion is active.',
  'Subscriptions: planned for a later release and not currently available.',
  'Coupon: no coupon code is required for the free-delivery promotion.',
  'Payments: customers pay SOLUM through Stripe; Awin tracks affiliate attribution and commission.',
]

const REQUIRED_KIT_CLAIM = 'GROUND includes the weekly clay mask. RITUAL adds organic argan body oil and the mixing bowl.'

function cleanField(value) {
  return value.replace(/(?:\n\s*-{3,}\s*)+$/, '').trim()
}

export function extractAwinProfileFields(copy) {
  if (typeof copy !== 'string') throw new Error('AWIN profile copy must be text')
  const fieldOneStart = copy.indexOf('FIELD 1')
  const fieldTwoStart = copy.indexOf('FIELD 2')
  if (fieldOneStart === -1 || fieldTwoStart === -1 || fieldTwoStart <= fieldOneStart) {
    throw new Error('AWIN profile field headings are missing')
  }

  const shortSection = copy.slice(fieldOneStart, fieldTwoStart)
  const recommendedMatch = shortSection.match(/Recommended[^:]*:\s*\n(?:-+\s*\n)?\s*([\s\S]*?)\n{2,}Alternate/)
  const alternateMatch = shortSection.match(/Alternate[^:]*:\s*\n(?:-+\s*\n)?\s*([\s\S]*)/)
  const fullSection = copy.slice(fieldTwoStart).replace(/^[\s\S]*?\n-{3,}\s*\n+/, '')
  if (!recommendedMatch || !alternateMatch) throw new Error('AWIN profile short summaries are missing')

  return {
    recommended: cleanField(recommendedMatch[1]),
    alternate: cleanField(alternateMatch[1]),
    full: fullSection.trim(),
  }
}

export function assertAwinProfileFields({ recommended, alternate, full }) {
  if (recommended.length > 255) throw new Error('AWIN recommended summary exceeds 255 characters')
  if (alternate.length > 255) throw new Error('AWIN alternate summary exceeds 255 characters')
  if (full.length > 2000) throw new Error('AWIN full description exceeds 2,000 characters')
  for (const term of REQUIRED_TERMS) {
    if (!full.includes(term)) throw new Error('AWIN programme terms are incomplete')
  }
  if (!full.includes(REQUIRED_KIT_CLAIM)) throw new Error('AWIN profile kit claim must keep the clay mask in GROUND')
  if (/Inside each kit:[\s\S]*?argan/i.test(full)) throw new Error('AWIN profile incorrectly assigns argan oil to each kit')
  if (/Turkey/i.test(full)) throw new Error('AWIN profile incorrectly claims Turkish sourcing for live kits')
}
