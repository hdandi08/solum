import { readFile } from 'node:fs/promises'

const rulesPath = new URL('../../artefacts/solum-web-amplify-custom-rules.json', import.meta.url)

const EXPECTED_RULES = [
  { source: '/.well-known/<*>', target: '/.well-known/<*>', status: '200' },
  {
    source: '/feeds/awin.csv',
    target: 'https://gvfptmjluxpngfjendbi.supabase.co/functions/v1/awin-feed',
    status: '200',
  },
  {
    source: '</^[^.]+$|\\.(?!(css|gif|ico|jpg|jpeg|js|png|txt|svg|woff|woff2|ttf|map|json|webp|mp4|webm|csv)$)([^.]+$)/>',
    target: '/index.html',
    status: '200',
  },
]

export async function loadSolumWebCustomRules() {
  return JSON.parse(await readFile(rulesPath, 'utf8'))
}

export function assertSolumWebCustomRules(rules) {
  if (JSON.stringify(rules) !== JSON.stringify(EXPECTED_RULES)) {
    throw new Error('Solum web custom rules must preserve the approved rule order and targets')
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  loadSolumWebCustomRules()
    .then(assertSolumWebCustomRules)
    .then(() => console.log('Solum web custom rules verified'))
    .catch(() => {
      console.error('Solum web custom rules verification failed')
      process.exitCode = 1
    })
}
