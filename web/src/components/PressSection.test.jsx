import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const component = (name) => readFileSync(resolve(__dirname, `${name}.jsx`), 'utf8');
const page = (name) => readFileSync(resolve(__dirname, '../pages', `${name}.jsx`), 'utf8');

describe('homepage press proof', () => {
  it('uses a direct body ritual claim without repeating first guided language', () => {
    const source = component('WhatSolumIs');

    expect(source).toContain('The Body Ritual Men Were Missing');
    expect(source).not.toContain('The First Guided');
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
    expect(home.indexOf('<ProblemSection />')).toBeGreaterThan(home.indexOf('<Marquee />'));
    expect(home.indexOf('<ProblemSection />')).toBeLessThan(home.indexOf('<PressSection />'));
    expect(home.indexOf('<PressSection />')).toBeLessThan(home.indexOf('<KitComparison />'));
  });

  it('keeps /buy press proof compact and close to the payment decision', () => {
    const buy = page('BuyPage');
    const proofIndex = buy.indexOf('className="by-press-proof"');
    const trustIndex = buy.indexOf('<div className="co-form-trust">');
    const expressIndex = buy.indexOf('<div className="by-express-wrap"');

    expect(proofIndex).toBeGreaterThan(-1);
    expect(buy).toContain('Featured by Luxury Lifestyle Magazine');
    expect(buy).toContain('Pioneering a new era of men’s body care');
    expect(buy).not.toContain('<PressSection />');
    expect(proofIndex).toBeLessThan(trustIndex);
    expect(proofIndex).toBeLessThan(expressIndex);
  });
});
