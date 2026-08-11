const PUBLIC_EXACT = new Set(['/', '/full', '/guide', '/ritual', '/success'])
const PUBLIC_PREFIXES = ['/guide/', '/product/']
const MASTER_TAG_ID = 'solum-awin-mastertag'

export function shouldLoadAwinMasterTag({ hostname, pathname, webdriver }) {
  if (!/^(www\.)?bysolum\.co\.uk$/.test(hostname) || webdriver === true) return false
  return PUBLIC_EXACT.has(pathname)
    || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export function ensureAwinMasterTag(documentRef) {
  if (documentRef.getElementById(MASTER_TAG_ID)) return null
  const script = documentRef.createElement('script')
  script.id = MASTER_TAG_ID
  script.src = 'https://www.dwin1.com/129171.js'
  script.defer = true
  documentRef.body.appendChild(script)
  return script
}

export function mustReloadWithoutAwin({ pathname, masterTagPresent }) {
  return masterTagPresent && !PUBLIC_EXACT.has(pathname)
    && !PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}
