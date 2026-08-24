import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const component = (name) => readFileSync(resolve(__dirname, `${name}.jsx`), 'utf8');
const dataFile = (name) => readFileSync(resolve(__dirname, '../data', `${name}.js`), 'utf8');

describe('premium homepage direction', () => {
  it('opens with an editorial ritual thesis instead of a hard problem headline', () => {
    const hero = component('Hero');

    expect(hero).toContain('A complete body ritual');
    expect(hero).toContain('Your body.<br />Finally done right.');
    expect(hero).not.toContain("So why don't you feel clean?");
    expect(hero).not.toContain('kitWorth');
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
    expect(kits).toContain('GROUND is the complete clean.');
    expect(kits).toContain('RITUAL is the complete deep ritual.');
    expect(kits).toContain('Everything in GROUND + Organic Argan Body Oil + Clay Mixing Bowl.');
    expect(kits).toContain('Clay clears. Argan feeds.');
    expect(kits).toContain('Used in the clay mix, on the scalp, and pressed into damp skin after rinsing.');
    expect(dataFile('kits')).toContain('clay mix, scalp and damp skin');
    expect(dataFile('kits')).not.toContain('weekly argan oil finish');
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
