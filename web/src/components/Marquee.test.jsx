import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('homepage marquee copy', () => {
  it('uses complete-system framing instead of product-count framing', () => {
    const source = readFileSync(resolve(__dirname, 'Marquee.jsx'), 'utf8');

    expect(source).toContain('COMPLETE SYSTEM. ONE RITUAL.');
    expect(source).not.toMatch(/9-PIECE SYSTEM/i);
    expect(source).not.toMatch(/TEN PRODUCTS/i);
  });
});
