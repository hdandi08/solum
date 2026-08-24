import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('homepage marquee copy', () => {
  it('uses the current nine-piece system claim instead of ten products', () => {
    const source = readFileSync(resolve(__dirname, 'Marquee.jsx'), 'utf8');

    expect(source).toContain('9-PIECE SYSTEM. ONE RITUAL.');
    expect(source).not.toMatch(/TEN PRODUCTS/i);
  });
});
