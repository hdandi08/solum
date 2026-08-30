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

    expect(hero).toContain('The shower system for men');
    expect(hero).toContain('Your shower cleans the surface.<br />We give you complete clean that lasts longer.');
    expect(hero).toContain('The products and method for the places normal showers miss: back, scalp, intimate areas and the damp-skin finish.');
    expect(hero).not.toContain('A complete ritual for skin, scalp and everything below the neck.');
    expect(hero).not.toContain('Your shower is missing<br />half the system.');
    expect(hero).not.toContain('SOLUM gives you the products and the exact method');
    expect(hero).not.toContain('Barrier-safe wash');
    expect(hero).not.toContain('hero-tags');
    expect(hero).not.toContain('hero-method-note');
    expect(hero).toContain('See the Kits');
    expect(hero).toContain('Read the press');
    expect(hero).not.toContain('Shop the Ritual');
    expect(hero).not.toContain('The first serious body care system for men');
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

  it('uses a matte editorial hero rather than tech-grid decoration', () => {
    const hero = component('Hero');

    expect(hero).toContain('hero-editorial-frame');
    expect(hero).toContain('hero-proof-strip');
    expect(hero).toContain('The ritual your shower was missing');
    expect(hero).toContain('Luxury Lifestyle Magazine');
    expect(hero).toContain('SOLUM is built around the work most showers skip.');
    expect(hero).not.toContain('hero-ghost');
    expect(hero).not.toContain('hero-glow');
    expect(hero).not.toContain('gridFade');
    expect(hero).not.toContain('background-size:60px 60px');
  });

  it('keeps the mobile hero action above the moving strip', () => {
    const hero = component('Hero');

    expect(hero).not.toContain('.hero{min-height:88svh;}');
    expect(hero).not.toContain('min-height:88svh;padding:108px 24px 36px');
    expect(hero).toContain('.hero{min-height:100svh;}');
    expect(hero).toContain('min-height:100svh;padding:108px 24px 72px');
  });

  it('lets the premium box lead on mobile without crowding the first fold', () => {
    const hero = component('Hero');

    expect(hero).toContain('.hero-visual .hero-box-img,.hero-visual video{object-position:center 18%;}');
    expect(hero).toContain('rgba(8,9,11,0.82) 0%');
    expect(hero).toContain('rgba(8,9,11,0.02) 72%');
    expect(hero).toContain(
      '.hero-editorial-frame{padding:0;background:transparent;border-color:transparent;border-top-color:transparent;box-shadow:none;backdrop-filter:none;}',
    );
    expect(hero).toContain('.hero-content{text-shadow:0 2px 18px rgba(0,0,0,.55);}');
    expect(hero).toContain('.hero-title{font-size:clamp(36px,11vw,56px);margin-bottom:16px;}');
    expect(hero).toContain('.btn-primary{padding:15px 32px;}');
    expect(hero).toContain('.hero-meta,.hero-proof-strip,.hero-editorial-note{display:none;}');
    expect(hero).not.toContain('background:rgba(8,9,11,.26)');
    expect(hero).not.toContain('backdrop-filter:blur(4px)');
    expect(hero).not.toContain('background:rgba(8,9,11,.46)');
    expect(hero).not.toContain('.hero-editorial-frame{padding:22px 18px 20px;background:rgba(8,9,11,.64);}');
  });

  it('keeps homepage-visible copy free of dash separators', () => {
    const copy = homepageCopy();

    expect(copy).not.toContain('—');
    expect(copy).not.toContain('--');
  });

  it('frames the problem section as premium category education, not shame copy', () => {
    const problem = component('ProblemSection');

    expect(problem).toContain('Why the old shower fails');
    expect(problem).toContain('Most men wash the easy parts and hope the rest is fine.');
    expect(problem).toContain('The problem is not effort. It is coverage, sequence and finish.');
    expect(problem).toContain('One bottle. Hot water. Hands.');
    expect(problem).toContain('That leaves sensitive skin over-stripped, the back under-scrubbed, the scalp heavy and the finish missing.');
    expect(problem).toContain('Choose Your Kit');
    expect(problem).not.toContain('See the Kits');
    expect(problem).not.toContain('Your shower is doing half the job.');
    expect(problem).not.toContain('Clean is not the same as cared for.');
    expect(problem).not.toContain('Most men do not need more products.');
    expect(problem).not.toContain('That explains the rough skin, the missed back, the scalp buildup and the clean-for-an-hour feeling.');
    expect(problem).not.toContain("It isn't hygiene.");
    expect(problem).not.toContain("You still don't feel clean.");
  });

  it('makes the problem section read like an editorial diagnosis, not icon-card clutter', () => {
    const problem = component('ProblemSection');

    expect(problem).toContain('problem-editorial');
    expect(problem).toContain('problem-diagnosis');
    expect(problem).toContain('The old method');
    expect(problem).toContain('The SOLUM method');
    expect(problem).toContain('Rinse and hope.');
    expect(problem).toContain('Cleanse. Scrub. Reset. Finish.');
    expect(problem).toContain('.problem-diagnosis{display:grid;grid-template-columns:repeat(5,1fr);');
    expect(problem).not.toContain('problem-card-ic');
  });

  it('keeps selling sections outcome-led rather than detail-led', () => {
    const problem = component('ProblemSection');
    const provenance = component('ProvenanceSection');
    const products = component('ProductLineup');

    expect(problem).toContain('Barrier-safe clean');
    expect(problem).toContain('Back and body scrubbed');
    expect(problem).toContain('Intimate clean');
    expect(problem).toContain('Scalp reset');
    expect(problem).toContain('Clean that lasts');
    expect(problem).toContain('The full sequence cleans, scrubs, resets and finishes so your whole body feels properly clean for longer.');
    expect(problem).toContain('SOLUM gives you the pieces and the method: what to use, where to use it, and how to finish so clean lasts.');
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

    expect(system).toContain('Why the order matters');
    expect(system).toContain('The result comes from sequence.');
    expect(system).toContain('One bottle, hands, hot water.');
    expect(system).toContain('Scalp first. Wash. Reach the back. Reset weekly. Finish damp.');
    expect(system).toContain('Cleaner roots, a properly reached back, smoother skin and a calmer finish after towelling.');
    expect(system).not.toContain('Nobody ever gave you');
    expect(system).not.toContain('ritual-ledger');
    expect(ritual).toContain('First see the method. Then the product list makes sense.');
    expect(ritual).toContain('Less buildup and a fresher root feel.');
    expect(ritual).toContain('Seals the weekly reset so skin feels fed, not dry.');
    expect(ritual).toContain('Clay mix, scalp, full-body reset, oil finish.');
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
    expect(press).toContain('Independent coverage for SOLUM.');
    expect(press).not.toContain('Independent coverage for the first SOLUM ritual.');
  });

  it('orders the homepage as diagnosis, proof, price, usage, then contents', () => {
    const home = page('FullSite');

    expect(home.indexOf('<ProblemSection />')).toBeLessThan(home.indexOf('<PressSection />'));
    expect(home.indexOf('<PressSection />')).toBeLessThan(home.indexOf('<KitComparison />'));
    expect(home.indexOf('<KitComparison />')).toBeLessThan(home.indexOf('<RitualInAction />'));
    expect(home.indexOf('<RitualInAction />')).toBeLessThan(home.indexOf('<ProductLineup />'));
    expect(home.indexOf('<RitualInAction />')).toBeLessThan(home.indexOf('<WhatSolumIs />'));
    expect(home.indexOf('<WhatSolumIs />')).toBeLessThan(home.indexOf('<SystemSection />'));
    expect(home).not.toContain('<FrictionStrip />');
  });

  it('moves the first guided ritual framing out of the top repetition loop', () => {
    const what = component('WhatSolumIs');

    expect(what).toContain('The Body Ritual Men Were Missing');
    expect(what).not.toContain('The First Guided');
    expect(what).not.toContain('Ritual for Men');
  });

  it('splits daily and weekly rituals before the product list', () => {
    const ritual = component('RitualInAction');

    expect(ritual).toContain('ria-ritual-overview');
    expect(ritual).toContain('ria-ritual-block daily');
    expect(ritual).toContain('ria-ritual-block weekly');
    expect(ritual).toContain('aria-label={`${ritual.title} videos`}');
    expect(ritual).toContain('Daily Ritual');
    expect(ritual).toContain('Every shower · 10 minutes');
    expect(ritual).toContain('Scalp Massager');
    expect(ritual).toContain('Body Wash');
    expect(ritual).toContain('Back Scrub Cloth');
    expect(ritual).toContain('Body Lotion');
    expect(ritual).toContain('Weekly Deep Reset');
    expect(ritual).toContain('Once a week · 22 minutes');
    expect(ritual).toContain('Atlas Clay Mask');
    expect(ritual).toContain('Argan Body Oil');
    expect(ritual).toContain('Clay mix');
    expect(ritual).toContain('skin fed, not dry');
    expect(ritual).toContain('key={`${step.ritual}-${step.slug}`}');
    expect(ritual).not.toContain('Watch Daily');
    expect(ritual).not.toContain('Watch Weekly');
    expect(ritual).not.toContain('chooseRitual');
    expect(ritual).not.toContain('activeRitual');
  });

  it('uses a quieter sequence explanation instead of the old dense ritual ledger', () => {
    const system = component('SystemSection');

    expect(system).toContain('sequence-proof');
    expect(system).toContain('Why the order matters');
    expect(system).toContain('Old shower');
    expect(system).toContain('SOLUM sequence');
    expect(system).toContain('What changes');
    expect(system).toContain('The daily ritual maintains. The weekly ritual resets.');
    expect(system).not.toContain('The Ritual Ledger');
    expect(system).not.toContain('03 works after clay');
    expect(system).not.toContain('body-diagram');
  });

  it('makes the kit offer feel like a curated ritual rather than a generic product grid', () => {
    const kits = component('KitComparison');

    expect(kits).toContain('GROUND or RITUAL.');
    expect(kits).toContain('kit-editorial-note');
    expect(kits).toContain('Two ways to start.');
    expect(kits).toContain('Both kits give you the products and the exact routine. GROUND gets you properly clean. RITUAL gets you properly clean and properly fed.');
    expect(kits).toContain('Buy {kit.name} · £{kit.firstBoxPrice}');
    expect(kits).not.toContain('Get {kit.name}');
    expect(kits).not.toContain("You're not buying products.");
  });

  it('explains the real difference between GROUND and RITUAL before the product toggle', () => {
    const kits = component('KitComparison');

    expect(kits).toContain('kit-card-decision');
    expect(kits).toContain('The clean foundation');
    expect(kits).toContain('The complete finish');
    expect(kits).toContain('Properly clean.');
    expect(kits).toContain('Properly clean. Properly fed.');
    expect(kits).toContain('Daily clean, scalp, back, exfoliation, clay reset and lotion.');
    expect(kits).toContain('Everything in GROUND, plus argan oil and the clay bowl.');
    expect(kits).toContain('It stops before the argan oil finish.');
    expect(kits).toContain('Argan oil completes the weekly reset: mixed into clay, worked through scalp and pressed into damp skin.');
    expect(kits).not.toContain('kit-difference');
    expect(kits).not.toContain('kit-outcome');
    expect(kits).not.toContain('kit-chooser');
    expect(dataFile('kits')).toContain('clay mix, scalp and damp skin');
    expect(dataFile('kits')).not.toContain('weekly argan oil finish');
  });

  it('makes the kit comparison readable before the carousel or product toggle', () => {
    const kits = component('KitComparison');

    expect(kits).toContain('kit-decision-matrix');
    expect(kits).toContain('GROUND');
    expect(kits).toContain('RITUAL');
    expect(kits).toContain('Simple rule');
    expect(kits).toContain('Start here if you want the full body clean without the oil finish.');
    expect(kits).toContain('Choose this if you want the weekly reset to end with skin fed, not just rinsed.');
    expect(kits).toContain('If you are unsure, choose RITUAL. It is the system as designed.');
    expect(kits).not.toContain('What both kits do');
    expect(kits).not.toContain('Where GROUND stops');
    expect(kits).not.toContain('Why argan oil matters');
  });

  it('makes RITUAL feel like the editorial hero kit while GROUND remains a quiet alternative', () => {
    const kits = component('KitComparison');

    expect(kits).toContain('grid-template-columns:minmax(0,.86fr) minmax(0,1.14fr)');
    expect(kits).toContain('kit-card.featured{transform:translateY(-18px)');
    expect(kits).toContain('kit-card:not(.featured){opacity:.82');
    expect(kits).toContain('background:radial-gradient(circle at 50% 36%');
    expect(kits).toContain('kit-cta.active{background:var(--bone)');
    expect(kits).not.toContain('box-shadow:0 30px 90px rgba(0,0,0,.22)');
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
    expect(buy).toContain('Not a subscription');
    expect(buy).toContain('No refill starts today.');
    expect(buy).toContain('by-kit-mini-ledger');
    expect(buy).toContain('Daily: 10 min');
    expect(buy).toContain('Weekly: 22 min');
    expect(buy).toContain('Argan finish');
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

  it('keeps legal and footer subscription copy aligned with one-time launch checkout', () => {
    const terms = page('TermsPage');
    const footer = component('SolumFooter');

    expect(terms).toContain('Subscription has not launched yet');
    expect(terms).toContain('Current live purchase');
    expect(terms).toContain('one-time kit purchase');
    expect(footer).toContain('Refills coming soon');
    expect(terms).not.toContain('men\\\'s body care subscription');
    expect(terms).not.toContain('5. Subscription Terms');
    expect(terms).not.toContain('£38/month subscription');
    expect(terms).not.toContain('£48/month subscription');
    expect(terms).not.toContain('entering into a subscription agreement');
    expect(terms).not.toContain('each subsequent monthly renewal');
    expect(terms).not.toContain('Monthly subscription payments are non-refundable');
    expect(footer).not.toContain('>Subscription<');
  });

  it('keeps public product education claim-safe and away from banned brand language', () => {
    const products = dataFile('products');
    const guide = dataFile('guide');
    const kits = component('KitComparison');
    const publicCopy = [products, guide, kits].join('\n');

    expect(products).toContain("stat: '3-min'");
    expect(products).toContain("tileAfter: 'clean everywhere, no tight feeling'");
    expect(products).toContain("tagline: 'Cleaner roots. Fresher scalp. Daily.'");
    expect(products).toContain("stat: 'weekly'");
    expect(products).toContain("name: 'Beidi Black Cleanse'");
    expect(guide).toContain('harsher foaming detergents');
    expect(kits).toContain('Beidi Black Cleanse');

    [
      'industrial degreaser',
      'Clinically 75×',
      '+120% blood flow',
      '24-week study',
      'Thicker hair',
      '68% improvement',
      '24% improvement',
      'toxins',
      'repairs the skin barrier',
      'rebuilds the skin barrier',
      'Restores the skin barrier',
      'Restores, repairs',
      'zero irritation',
      'Eliminates intimate odour',
      'actively kills',
      'Black Soap',
      'black soap',
    ].forEach((unsafePhrase) => {
      expect(publicCopy).not.toContain(unsafePhrase);
    });
  });

  it('slows the moving strip so it reads like a premium detail, not an ad ticker', () => {
    const marquee = component('Marquee');

    expect(marquee).toContain('animation:marquee 42s linear infinite');
    expect(marquee).toContain('PRESS-RECOGNISED');
  });
});
