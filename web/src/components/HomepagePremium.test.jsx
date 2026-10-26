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
  it('opens with the guided shower ritual promise and one clear action', () => {
    const hero = component('Hero');

    expect(hero).not.toContain('The shower system for men');
    expect(hero).toContain('The shower ritual men were never given.');
    expect(hero).toContain('A guided, deeper clean for your scalp, back, intimate areas and everything in between, with a clean finish that lasts.');
    expect(hero).toContain('Start Your Ritual');
    expect(hero).not.toContain('See the Kits');
    expect(hero).not.toContain('hero-meta');
    expect(hero).not.toContain('Read the press');
    expect(hero).not.toContain('hero-proof-strip');
    expect(hero).not.toContain('hero-editorial-note');
    expect(hero).not.toContain('scroll-cue');
    expect(hero).not.toContain('A complete ritual for skin, scalp and everything below the neck.');
    expect(hero).not.toContain('Your shower is missing<br />half the system.');
    expect(hero).not.toContain('SOLUM gives you the products and the exact method');
    expect(hero).not.toContain('The products and method for the places normal showers miss');
    expect(hero).not.toContain('Barrier-safe wash');
    expect(hero).not.toContain('hero-tags');
    expect(hero).not.toContain('hero-method-note');
    expect(hero).not.toContain('Shop the Ritual');
    expect(hero).not.toContain('The first serious body care system for men');
    expect(hero).not.toContain('A guided 9-piece system');
    expect(hero).not.toContain('9 pieces, numbered');
    expect(hero).not.toContain("So why don't you feel clean?");
    expect(hero).not.toContain('kitWorth');
  });

  it('keeps the desktop hero in one viewport without clipping the fixed header', () => {
    const hero = component('Hero');

    expect(hero).toContain('.hero{flex-direction:row;height:100svh;min-height:0;overflow:hidden;align-items:stretch;}');
    expect(hero).toContain('.hero-cols{flex:0 0 52%;min-height:0;padding:clamp(82px,11vh,104px) 48px 40px;justify-content:flex-start;}');
    expect(hero).toContain('.hero-visual{flex:0 0 48%;width:48%;height:100%;max-height:none;min-height:0;}');
  });

  it('uses a readable desktop headline scale and restrained supporting copy', () => {
    const hero = component('Hero');

    expect(hero).toContain('.hero-title{font-size:clamp(52px,4.5vw,72px);line-height:.92;margin-bottom:16px;}');
    expect(hero).toContain('.hero-subline{font-size:16px;line-height:1.45;margin-bottom:16px;}');
    expect(hero).not.toContain('.hero-meta{margin:0 0 16px;}');
    expect(hero).not.toContain('.hero-proof-strip{grid-template-columns:auto 1fr;');
  });

  it('uses a matte editorial hero rather than tech-grid decoration', () => {
    const hero = component('Hero');

    expect(hero).toContain('hero-editorial-frame');
    expect(hero).toContain('hero-subline');
    expect(hero).toContain('hero-press-proof');
    expect(hero).toContain('Luxury<span>Lifestyle Magazine</span>');
    expect(hero).toContain('Pioneering a new era of men’s body care');
    expect(hero).not.toContain('<blockquote');
    expect(hero).not.toContain('The ritual your shower was missing');
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
    expect(hero).toContain('.hero-title{font-size:clamp(31px,9.4vw,46px);line-height:.98;margin-bottom:14px;}');
    expect(hero).toContain('.btn-primary{padding:15px 32px;}');
    expect(hero).toContain('.hero-subline{font-size:14px;line-height:1.45;margin-bottom:18px;}');
    expect(hero).not.toContain('.hero-meta,.hero-proof-strip,.hero-editorial-note{display:none;}');
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

  it('makes the shower difference clear in one fast comparison', () => {
    const problem = component('ProblemSection');

    expect(problem).toContain('The ten minutes you already spend in the shower.<br />A better system for your body.');
    expect(problem).not.toContain('Same ten minutes.<br />A better system.');
    expect(problem).toContain('What most men do');
    expect(problem).toContain('One bottle.<br /><span>Hands.</span><br /><span>Hot water.</span>');
    expect(problem).toContain('Cleans the easy parts. The rest is left to chance.');
    expect(problem).toContain('The SOLUM plan');
    expect(problem).toContain('Cleanse. Reach. Reset. Finish.');
    expect(problem).toContain('A guided, deeper clean that lasts.');
    expect(problem).not.toContain('Choose Your Kit');
    expect(problem).not.toContain('Your shower is doing half the job.');
    expect(problem).not.toContain('Clean is not the same as cared for.');
    expect(problem).not.toContain('Most men do not need more products.');
    expect(problem).not.toContain('That explains the rough skin, the missed back, the scalp buildup and the clean-for-an-hour feeling.');
    expect(problem).not.toContain("It isn't hygiene.");
    expect(problem).not.toContain("You still don't feel clean.");
  });

  it('uses a visual comparison instead of a dense diagnosis grid', () => {
    const problem = component('ProblemSection');

    expect(problem).toContain('problem-comparison');
    expect(problem).toContain('problem-panel old');
    expect(problem).toContain('problem-panel solum');
    expect(problem).toContain('problem-status old');
    expect(problem).toContain('problem-status solum');
    expect(problem).toContain('.problem-status{width:28px;height:28px;');
    expect(problem).toContain('.problem-status.old{color:#c85b5b;}');
    expect(problem).toContain('.problem-status.solum{color:var(--blit);}');
    expect(problem).toContain('.problem-comparison{display:grid;grid-template-columns:1fr 1fr;');
    expect(problem).toContain('.problem-header{max-width:820px;}');
    expect(problem).toContain("font-size:clamp(36px,3.4vw,44px);");
    expect(problem).not.toContain('problem-diagnosis');
    expect(problem).not.toContain('position:sticky');
  });

  it('keeps desktop homepage sections within a readable viewport-first hierarchy', () => {
    const problem = component('ProblemSection');
    const kits = component('KitComparison');
    const ritual = component('RitualInAction');
    const products = component('ProductLineup');
    const what = component('WhatSolumIs');
    const system = component('SystemSection');
    const unboxing = component('UnboxingFilm');
    const band = component('FullBleedBand');
    const cta = component('CTASection');

    expect(problem).toContain('.problem-section{background:linear-gradient(180deg,var(--black),#0b0d11);border-top:1px solid var(--line);padding:clamp(56px,6vw,76px) 48px;}');
    expect(problem).toContain('.problem-header{max-width:820px;}');
    expect(problem).toContain('font-size:clamp(36px,3.4vw,44px);');
    expect(problem).toContain('.problem-panel{min-height:270px;');
    expect(kits).toContain('.kits-section{background:linear-gradient(180deg,#090b0f,var(--black));padding:clamp(48px,5vw,64px) 48px;border-top:1px solid var(--line);min-height:calc(100svh - 62px);display:flex;align-items:center;}');
    expect(kits).toContain('font-size:clamp(36px,4.2vw,52px);');
    expect(kits).toContain('Both give you a complete body clean. RITUAL adds body oil for the weekly finish.');
    expect(ritual).toContain('.ria-head{font-family:\'Bebas Neue\',sans-serif;font-size:clamp(36px,4.2vw,54px);');
    expect(products).toContain('.products-section{background:var(--black);padding:68px 0;border-top:1px solid var(--line);}');
    expect(products).toContain('font-size:clamp(38px,4.2vw,54px);');
    expect(what).toContain('font-size:clamp(30px,4vw,48px);');
    expect(system).toContain('.system-section{background:var(--black);padding:64px 0;border-top:1px solid var(--line);}');
    expect(system).toContain('font-size:clamp(34px,4vw,50px);');
    expect(unboxing).toContain('.unbox-section{background:var(--black);padding:72px 48px;border-top:1px solid var(--line);}');
    expect(unboxing).toContain('font-size:clamp(32px,4.2vw,50px);');
    expect(band).toContain('font-size:clamp(44px,5vw,64px);');
    expect(cta).toContain('.cta-section{background:var(--char);border-top:1px solid var(--lineb);text-align:center;padding:96px 48px;position:relative;overflow:hidden;}');
    expect(cta).toContain('font-size:clamp(48px,5vw,68px);');
  });

  it('keeps selling sections outcome-led rather than detail-led', () => {
    const problem = component('ProblemSection');
    const provenance = component('ProvenanceSection');
    const products = component('ProductLineup');

    expect(problem).toContain('Cleans the easy parts. The rest is left to chance.');
    expect(problem).toContain('A guided, deeper clean that lasts.');
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

  it('puts the press feature directly after the hero, before the category education', () => {
    const home = page('FullSite');

    expect(home.indexOf('<Hero />')).toBeLessThan(home.indexOf('<PressSection />'));
    expect(home.indexOf('<PressSection />')).toBeLessThan(home.indexOf('<Marquee />'));
    expect(home.indexOf('<Marquee />')).toBeLessThan(home.indexOf('<ProblemSection />'));
    expect(home.indexOf('<ProblemSection />')).toBeLessThan(home.indexOf('<KitComparison />'));
    expect(home.indexOf('<KitComparison />')).toBeLessThan(home.indexOf('<RitualInAction />'));
    expect(home.indexOf('<RitualInAction />')).toBeLessThan(home.indexOf('<ProductLineup />'));
    expect(home.indexOf('<RitualInAction />')).toBeLessThan(home.indexOf('<WhatSolumIs />'));
    expect(home.indexOf('<WhatSolumIs />')).toBeLessThan(home.indexOf('<SystemSection />'));
    expect(home).not.toContain('<FrictionStrip />');
  });

  it('uses the hero itself as the desktop home for press proof', () => {
    const press = component('PressSection');

    expect(press).toContain('@media(min-width:960px){.press-section{display:none;}}');
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
    expect(ritual).toContain('ria-cadence-summary');
    expect(ritual).toContain('aria-label="Daily and weekly ritual cadence"');
    expect(ritual).toContain('RITUALS.map(({ key, title, cadence }) => (');
    expect(ritual).not.toContain('.ria-cadence-summary-item.weekly .ria-cadence-time{color:#c8a96e;}');
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

  it('keeps the kit choice concise before shoppers enter either card', () => {
    const kits = component('KitComparison');

    expect(kits).toContain('GROUND or RITUAL.');
    expect(kits).toContain('Both give you a complete body clean. RITUAL adds body oil for the weekly finish.');
    expect(kits).not.toContain('Two ways to start.');
    expect(kits).not.toContain('kit-editorial-note');
    expect(kits).not.toContain('kit-decision-matrix');
    expect(kits).not.toContain('kits-footnote');
    expect(kits).not.toContain('First batch · 250 kits');
    expect(kits).toContain('Buy {kit.name} · £{kit.firstBoxPrice}');
    expect(kits).not.toContain('Get {kit.name}');
    expect(kits).not.toContain("You're not buying products.");
  });

  it('states each kit outcome once before its price and product list', () => {
    const kits = component('KitComparison');

    expect(kits).toContain('kit-name-row');
    expect(kits).toContain('<span className="kit-card-price">£{kit.firstBoxPrice}</span>');
    expect(kits).toContain('kit-card-decision');
    expect(kits).toContain('Properly clean.');
    expect(kits).toContain('Properly clean. Skin properly fed.');
    expect(kits).not.toContain('Daily clean, scalp, back, exfoliation, clay reset and lotion.');
    expect(kits).not.toContain('Everything in GROUND, plus argan oil and the clay bowl.');
    expect(kits).not.toContain('It stops before the argan oil finish.');
    expect(kits).not.toContain('Argan oil completes the weekly reset: mixed into clay, worked through scalp and pressed into damp skin.');
    expect(kits).not.toContain('kit-difference');
    expect(kits).not.toContain('kit-outcome');
    expect(kits).not.toContain('kit-chooser');
    expect(dataFile('kits')).toContain('clay mix, scalp and damp skin');
    expect(dataFile('kits')).not.toContain('weekly argan oil finish');
  });

  it('keeps desktop kit imagery compact enough for the names, prices, and outcomes to follow in the first view', () => {
    const kits = component('KitComparison');

    expect(kits).toContain('height:185px;');
    expect(kits).toContain('.kit-card.featured .kit-badge{display:none;}');
  });

  it('keeps the enlarged desktop kit imagery out of the mobile gallery', () => {
    const kits = component('KitComparison');

    expect(kits).toContain('.kit-slide img{width:100%;height:100%;max-width:100%;object-fit:contain;}');
  });

  it('puts each ritual video before its detailed mobile step list', () => {
    const ritual = component('RitualInAction');

    expect(ritual).toContain('.ria-ritual-overview{display:contents;}');
    expect(ritual).toContain('.ria-ritual-card{grid-column:2;grid-row:1;}');
    expect(ritual).toContain('.ria-gallery{grid-column:1/-1;grid-row:2;}');
    expect(ritual).toContain('.ria-ritual-sequence{grid-column:2;grid-row:3;}');
  });

  it('keeps kit-card copy restrained and puts the product expander directly after the outcome', () => {
    const kits = component('KitComparison');

    expect(kits).toContain('.kit-name{font-family:\'Bebas Neue\',sans-serif;font-size:40px;');
    expect(kits).toContain('.kit-decision-title{font-family:\'Bebas Neue\',sans-serif;font-size:22px;');
    expect(kits).toContain('See all ${products.filter(p => !p.comingSoon).length} products');
    expect(kits).toContain('.kit-products-toggle{display:flex;align-items:center;justify-content:space-between;width:100%;background:rgba(46,109,164,.16);');
  });

  it('puts the seven-versus-nine-piece distinction on the kit imagery', () => {
    const kits = component('KitComparison');

    expect(kits).toContain('kit-comparison-overlay');
    expect(kits).toContain('7-PIECE KIT');
    expect(kits).toContain('9-PIECE KIT');
    expect(kits).toContain('The complete clean');
    expect(kits).toContain('Adds body oil + clay bowl');
  });

  it('keeps the complete desktop kit choice in the first viewport', () => {
    const kits = component('KitComparison');

    expect(kits).toContain('.kit-slide{flex:0 0 100%;scroll-snap-align:center;height:185px;');
    expect(kits).toContain('.kit-slide img{width:auto;height:330px;max-width:none;object-fit:contain;display:block;filter:brightness(1.18) contrast(1.04);}');
    expect(kits).toContain('kit-card-actions');
    expect(kits).not.toContain('kit-prices');
    expect(kits).not.toContain('kits-footnote');
    expect(kits).not.toContain('offerActive');
  });

  it('makes RITUAL feel like the editorial hero kit while GROUND remains a quiet alternative', () => {
    const kits = component('KitComparison');

    expect(kits).toContain('grid-template-columns:minmax(0,.86fr) minmax(0,1.14fr)');
    expect(kits).toContain('kit-card.featured{transform:none;');
    expect(kits).toContain('kit-card:not(.featured){opacity:1;filter:none;}');
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
