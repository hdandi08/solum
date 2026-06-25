import { PRODUCTS } from '../src/data/products.js';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const CHECK_FILES = process.argv.includes('--files'); // file-existence checked after images built
let errors = [];

const slugs = new Set();
for (const p of PRODUCTS) {
  if (!p.slug) { errors.push(`${p.num} ${p.name}: missing slug`); continue; }
  if (slugs.has(p.slug)) errors.push(`${p.num}: duplicate slug ${p.slug}`);
  slugs.add(p.slug);
  if (!/^[a-z0-9-]+$/.test(p.slug)) errors.push(`${p.num}: slug not kebab-case: ${p.slug}`);
  if (!p.media) { errors.push(`${p.num}: missing media`); continue; }
  if (!p.comingSoon && !p.media.still) errors.push(`${p.num}: active product missing media.still`);
  if (!CHECK_FILES) continue;
  for (const f of [p.media.still, p.media.stillMobile, p.media.poster, ...(p.media.gallery || [])]) {
    if (f && !existsSync(join(PUBLIC, f))) errors.push(`${p.num}: missing file ${f}`);
  }
}
if (errors.length) { console.error('FAIL\n' + errors.join('\n')); process.exit(1); }
console.log(`OK — ${PRODUCTS.length} products, ${slugs.size} slugs${CHECK_FILES ? ', all files present' : ''}`);
