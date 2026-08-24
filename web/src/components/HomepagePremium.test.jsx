import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const component = (name) => readFileSync(resolve(__dirname, `${name}.jsx`), 'utf8');
const page = (name) => readFileSync(resolve(__dirname, '../pages', `${name}.jsx`), 'utf8');
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

    expect(hero).toContain('.hero{flex-direction:row;height:auto;min-height:calc(100svh + 88px);overflow:visible;align-items:stretch;}');
    expect(hero).toContain('.hero-cols{flex:0 0 48%;min-height:calc(100svh + 88px);padding:clamp(124px,14vh,152px) 48px 112px;justify-content:flex-start;}');
    expect(hero).toContain('.hero-visual{flex:0 0 52%;width:52%;height:auto;max-height:none;min-height:calc(100svh + 88px);}');
  });

  it('keeps desktop hero actions above the moving strip', () => {
    const hero = component('Hero');

    expect(hero).toContain('padding:clamp(124px,14vh,152px) 48px 112px');
    expect(hero).not.toContain('height:100svh;min-height:640px;');
    expect(hero).not.toContain('padding:clamp(144px,16vh,176px) 48px 56px');
  });

  it('keeps the mobile hero action above the moving strip', () => {
    const hero = component('Hero');

    expect(hero).not.toContain('.hero{min-height:88svh;}');
    expect(hero).not.toContain('min-height:88svh;padding:108px 24px 36px');
    expect(hero).toContain('.hero{min-height:100svh;}');
    expect(hero).toContain('min-height:100svh;padding:108px 24px 72px');
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
    expect(problem).toContain('Most men do not need more products.');
    expect(problem).not.toContain("It isn't hygiene.");
    expect(problem).not.toContain("You still don't feel clean.");
  });

  it('keeps selling sections outcome-led rather than detail-led', () => {
    const problem = component('ProblemSection');
    const provenance = component('ProvenanceSection');
    const products = component('ProductLineup');

    expect(problem).toContain('Freshness that lasts');
    expect(problem).toContain('Smoother skin you can feel');
    expect(problem).toContain('A back that feels properly clean');
    expect(problem).toContain('Comfortable skin that does not swing from tight to greasy');
    expect(products).toContain('See what each step changes before you tap into the detail.');
    expect(provenance).toContain('Chosen For The Result');
    expect(provenance).toContain('Skin feels calm after washing and comfortable after towelling.');
    expect(provenance).toContain('Smoother skin, less odour and a back that finally gets reached.');
    expect(provenance).not.toContain('direct descendants');
    expect(provenance).not.toContain('over 1,000 years');
    expect(provenance).not.toContain('UK Responsible Person registered');
  });

  it('keeps education sections current, safe and outcome-led', () => {
    const system = component('SystemSection');
    const ritual = component('RitualInAction');
    const guide = dataFile('guide');

    expect(system).toContain('Daily outcome');
    expect(system).toContain('Weekly reset');
    expect(system).toContain('Freshness lasts longer, roughness comes down and the back is no longer missed.');
    expect(system).toContain('Clay clears the surface, argan oil feeds the barrier, and the reset feels complete.');
    expect(ritual).toContain('What you feel after each step, not just what to do.');
    expect(ritual).toContain('Less buildup and a fresher root feel.');
    expect(ritual).toContain('Seals the weekly reset so skin feels fed, not dry.');
    expect(guide).toContain('10-minute daily ritual and a 22-minute weekly deep ritual');
    expect(guide).toContain('10 minutes daily, 22 minutes weekly');
    expect(guide).toContain('Wash first, then use the mitt and back cloth while skin is warm.');
    expect(guide).toContain('300g jar. Enough for weekly use for about 4 sessions.');
    expect(guide).not.toContain('18-minute weekly');
    expect(guide).not.toContain('18 minutes weekly');
    expect(guide).not.toContain('Exfoliate before washing.');
    expect(guide).not.toContain('over a thousand years');
    expect(guide).not.toContain('standard practice for a millennium');
    expect(guide).not.toContain('300g jar. Enough for weekly use for 3 to 4 months.');
    expect(guide).not.toContain('monthly subscription pricing');
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

    expect(kits).toContain('kit-card-decision');
    expect(kits).toContain('The essential system');
    expect(kits).toContain('The full ritual');
    expect(kits).toContain('Includes 10-min daily and 22-min weekly deep reset');
    expect(kits).toContain('Includes 10-min daily and complete 22-min weekly deep reset');
    expect(kits).toContain('Both kits include the 10-min daily ritual and the 22-min weekly deep reset.');
    expect(kits).toContain('GROUND stops before the argan oil finish and clay bowl.');
    expect(kits).toContain('RITUAL adds argan oil and the clay bowl.');
    expect(kits).toContain('less odour, smoother skin and a back you can actually reach');
    expect(kits).toContain('barrier feels fed, comfortable and complete');
    expect(kits).toContain('It goes into the clay mix, across the scalp, and onto damp skin after rinsing.');
    expect(kits).not.toContain('kit-difference');
    expect(kits).not.toContain('kit-outcome');
    expect(kits).not.toContain('kit-chooser');
    expect(dataFile('kits')).toContain('clay mix, scalp and damp skin');
    expect(dataFile('kits')).not.toContain('weekly argan oil finish');
  });

  it('labels product images inside the kit carousel so contents are clear before selecting', () => {
    const kits = component('KitComparison');
    const products = dataFile('products');

    expect(kits).toContain('productSlides');
    expect(kits).toContain('kit-slide-label');
    expect(kits).toContain('kit-slide-benefit');
    expect(kits).toContain('kit-slide-count');
    expect(kits).toContain('label: `${p.num} · ${p.name}`');
    expect(kits).toContain('benefit: p.outcome?.tileAfter');
    expect(products).toContain("name: 'Body Wash'");
    expect(products).toContain("name: 'Atlas Clay Mask'");
    expect(products).toContain("name: 'Argan Body Oil'");
    expect(products).toContain("name: 'Clay Mixing Bowl'");
    expect(kits).toContain('Full kit view');
  });

  it('keeps buy-page kit choice outcome-led at the conversion point', () => {
    const buy = page('BuyPage');

    expect(buy).toContain('BUY_KIT_OUTCOMES');
    expect(buy).toContain('Clean foundation');
    expect(buy).toContain('Includes the 10-min daily ritual and 22-min weekly deep reset for less odour, smoother skin and a back that is finally cleaned properly.');
    expect(buy).toContain('Complete ritual');
    expect(buy).toContain('The same clean foundation, plus fed skin and a stronger-feeling barrier after the clay reset.');
    expect(buy).toContain('Both kits have the 10-min daily and 22-min weekly system. RITUAL adds argan oil and the clay bowl.');
    expect(buy).not.toContain('daily + weekly ritual');
    expect(buy).not.toContain('the daily system');
    expect(buy).not.toContain('100% certified organic argan oil · 100% natural Atlas clay');
  });

  it('keeps post-purchase ritual timing aligned with current education', () => {
    const success = page('SuccessPage');

    expect(success).toContain('10 minutes every morning. 22 minutes once a week.');
    expect(success).toContain('Weekly · 22 min');
    expect(success).not.toContain('18 minutes once a week');
    expect(success).not.toContain('Weekly · 18 min');
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
