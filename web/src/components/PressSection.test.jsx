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

  it('keeps authentic supporting press after the product explanation', () => {
    const press = component('PressSection');
    const home = page('FullSite');

    expect(press).toContain('Luxury Lifestyle Magazine');
    expect(press).toContain('Pioneering a new era of men’s body care');
    expect(press).toContain('Carl Thompson');
    expect(press).toContain('rethinking body care');
    expect(press).toContain('https://www.luxurylifestylemag.co.uk/style-and-beauty/solum-pioneering-a-new-era-of-mens-body-care/');
    expect(press).toContain('https://www.carlthompson.co.uk/further-reading-blogs/2026/8/24/solum-the-new-mens-grooming-brand-rethinking-body-care');
    expect(home.indexOf('<Hero />')).toBeLessThan(home.indexOf('<PressSection />'));
    expect(home.indexOf('<ProductLineup />')).toBeLessThan(home.indexOf('<PressSection />'));
    expect(home.indexOf('<Marquee />')).toBeLessThan(home.indexOf('<ProblemSection />'));
    expect(home.indexOf('<ProblemSection />')).toBeLessThan(home.indexOf('<KitComparison />'));
  });

  it('hides the standalone press section on desktop because proof belongs in the hero', () => {
    const press = component('PressSection');

    expect(press).toContain('@media(min-width:960px){.press-section{display:none;}}');
  });

  it('keeps the award compact and ahead of express checkout', () => {
    const buy = page('BuyPage');
    const proofIndex = buy.indexOf('<AwardProof compact />');
    const expressIndex = buy.indexOf('<div className="by-express-wrap"');
    expect(proofIndex).toBeGreaterThan(-1);
    expect(proofIndex).toBeLessThan(expressIndex);
    expect(buy).not.toContain('Featured by Luxury Lifestyle Magazine');
  });
});
