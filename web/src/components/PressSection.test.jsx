import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const component = (name) => readFileSync(resolve(__dirname, `${name}.jsx`), 'utf8');
const page = (name) => readFileSync(resolve(__dirname, '../pages', `${name}.jsx`), 'utf8');

describe('homepage press proof', () => {
  it('uses the moderated first guided body ritual claim', () => {
    const source = component('WhatSolumIs');

    expect(source).toContain('The First Guided');
    expect(source).not.toMatch(/World['’]s First/i);
  });

  it('shows verified publication proof before the kit offer', () => {
    const press = component('PressSection');
    const home = page('FullSite');

    expect(press).toContain('Luxury Lifestyle Magazine');
    expect(press).toContain('Pioneering a new era of men’s body care');
    expect(press).toContain('Carl Thompson');
    expect(press).toContain('rethinking body care');
    expect(press).toContain('https://www.luxurylifestylemag.co.uk/style-and-beauty/solum-pioneering-a-new-era-of-mens-body-care/');
    expect(press).toContain('https://www.carlthompson.co.uk/further-reading-blogs/2026/8/24/solum-the-new-mens-grooming-brand-rethinking-body-care');
    expect(home.indexOf('<PressSection />')).toBeGreaterThan(home.indexOf('<ProblemSection />'));
    expect(home.indexOf('<PressSection />')).toBeLessThan(home.indexOf('<KitComparison />'));
  });
});
