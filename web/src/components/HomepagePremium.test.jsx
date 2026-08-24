import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const component = (name) => readFileSync(resolve(__dirname, `${name}.jsx`), 'utf8');
const dataFile = (name) => readFileSync(resolve(__dirname, '../data', `${name}.js`), 'utf8');
const visibleSource = (source) => source
  .replace(/const CSS = `[\s\S]*?`;/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '')
  .replace(/var\(--[^)]+\)/g, 'var()');

const homepageCopy = () => [
  component('Hero'),
  component('PressSection'),
  component('ProblemSection'),
  component('KitComparison'),
  component('Marquee'),
  component('UnboxingFilm'),
  component('SubscriptionSection'),
  dataFile('kits'),
].map(visibleSource).join('\n');

describe('premium homepage direction', () => {
  it('opens with an editorial ritual thesis instead of a hard problem headline', () => {
    const hero = component('Hero');

    expect(hero).toContain('The first serious body care system for men');
    expect(hero).toContain('Your body.<br />Finally done right.');
    expect(hero).toContain('A complete ritual for skin, scalp and everything below the neck.');
    expect(hero).not.toContain('A guided 9-piece system');
    expect(hero).not.toContain('9 pieces, numbered');
    expect(hero).not.toContain("So why don't you feel clean?");
    expect(hero).not.toContain('kitWorth');
  });

  it('keeps desktop hero copy clear of the fixed header', () => {
    const hero = component('Hero');

    expect(hero).toContain('.hero-cols{flex:0 0 48%;padding:clamp(144px,16vh,176px) 48px 56px;justify-content:flex-start;}');
  });

  it('keeps homepage-visible copy free of dash separators', () => {
    const copy = homepageCopy();

    expect(copy).not.toContain('—');
    expect(copy).not.toContain('--');
  });

  it('frames the problem section as premium category education, not shame copy', () => {
    const problem = component('ProblemSection');

    expect(problem).toContain('The missing step');
    expect(problem).toContain('A shower cleans the surface.<br />A ritual changes the result.');
    expect(problem).toContain('Most men do not need a longer routine.');
    expect(problem).not.toContain("It isn't hygiene.");
    expect(problem).not.toContain("You still don't feel clean.");
  });

  it('treats press as quiet editorial validation near the top of the page', () => {
    const press = component('PressSection');

    expect(press).toContain('press-ledger');
    expect(press).toContain('As featured in');
    expect(press).toContain('Pioneering a new era of men’s body care');
    expect(press).toContain('Independent coverage');
  });

  it('makes the kit offer feel like a curated ritual rather than a generic product grid', () => {
    const kits = component('KitComparison');

    expect(kits).toContain('The Ritual System.');
    expect(kits).toContain('kit-editorial-note');
    expect(kits).toContain('Choose the ritual you want to start with.');
  });

  it('explains the real difference between GROUND and RITUAL before the product toggle', () => {
    const kits = component('KitComparison');

    expect(kits).toContain('kit-difference');
    expect(kits).toContain('How to choose');
    expect(kits).toContain('Choose GROUND if you want the complete clean.');
    expect(kits).toContain('Choose RITUAL if you want the full deep ritual.');
    expect(kits).toContain('Argan oil matters because clay clears and argan feeds.');
    expect(kits).toContain('It goes into the clay mix, across the scalp, and onto damp skin after rinsing.');
    expect(kits).not.toContain('kit-difference-panel');
    expect(kits).not.toContain('kit-system-role');
    expect(dataFile('kits')).toContain('clay mix, scalp and damp skin');
    expect(dataFile('kits')).not.toContain('weekly argan oil finish');
  });

  it('labels product images inside the kit carousel so contents are clear before selecting', () => {
    const kits = component('KitComparison');
    const products = dataFile('products');

    expect(kits).toContain('productSlides');
    expect(kits).toContain('kit-slide-label');
    expect(kits).toContain('kit-slide-count');
    expect(kits).toContain('label: `${p.num} · ${p.name}`');
    expect(products).toContain("name: 'Body Wash'");
    expect(products).toContain("name: 'Atlas Clay Mask'");
    expect(products).toContain("name: 'Argan Body Oil'");
    expect(products).toContain("name: 'Clay Mixing Bowl'");
    expect(kits).toContain('Full kit view');
  });

  it('keeps subscription replenishment language explicitly tied to launch', () => {
    const unboxing = component('UnboxingFilm');
    const subscription = component('SubscriptionSection');
    const guide = dataFile('guide');

    expect(unboxing).toContain('refill subscription launches');
    expect(subscription).toContain('When subscription launches, only what you have run out of arrives at your door.');
    expect(guide).toContain('When subscription launches, refill boxes will cover the consumables that run out.');
    expect(guide).not.toContain('refills that arrive monthly.');
  });

  it('slows the moving strip so it reads like a premium detail, not an ad ticker', () => {
    const marquee = component('Marquee');

    expect(marquee).toContain('animation:marquee 42s linear infinite');
    expect(marquee).toContain('PRESS-RECOGNISED');
  });
});
