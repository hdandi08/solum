import { useEffect, useRef } from 'react';
import { capture } from '../lib/analytics.js';
import { GIFT_CHECKOUT_PARAMS } from '../lib/landingExperience.js';
import Nav from '../components/Nav.jsx';
import Hero from '../components/Hero.jsx';
import WhatSolumIs from '../components/WhatSolumIs.jsx';
import RitualInAction from '../components/RitualInAction.jsx';
import ProductPhotoSwitcher from '../components/ProductPhotoSwitcher.jsx';
import PressSection from '../components/PressSection.jsx';
import KitComparison from '../components/KitComparison.jsx';
import FAQ from '../components/FAQ.jsx';
import UnboxingFilm from '../components/UnboxingFilm.jsx';
import SolumFooter from '../components/SolumFooter.jsx';
import FounderChat from '../components/FounderChat.jsx';
import { KITS } from '../data/kits.js';
import './GiftPage.css';

const GIFT_NAV = [
  ['#gift-story', 'The gift'],
  ['#kits', 'Choose his kit'],
  ['#ritual', 'His ritual'],
  ['#gift-questions', 'Questions'],
];

const GIFT_PILLARS = [
  { n: '01', ic: '/icons/pillar-body.webp', title: 'Care for his whole body.', body: 'Face and hair have their routines. SOLUM brings the same attention to his body: wash, exfoliation, back care and moisturising, with a scalp massage step too.' },
  { n: '02', ic: '/icons/pillar-guided.webp', title: 'A gift he knows how to use.', body: 'Products, tools and a step-by-step guide in one box. He can scan the QR code, follow the order and make the routine his own.' },
  { n: '03', ic: '/icons/pillar-time.webp', title: 'Something for his everyday.', body: 'A daily shower ritual and a slower weekly reset. A thoughtful Christmas gift that becomes a little time for himself.' },
];

const GIFT_FAQS = [
  { q: 'What comes in his gift?', a: 'GROUND contains body wash, an exfoliating mitt, a back scrub cloth, a scalp massager, rhassoul clay, body lotion and a bamboo cloth. RITUAL includes everything in GROUND, plus organic argan body oil and a clay mixing bowl. Both come in the SOLUM box with a QR code linking to the step-by-step ritual guide.' },
  { q: 'Will he know how to use it?', a: 'Yes. The QR code inside the box opens his step-by-step guide. It walks him through the daily routine and weekly ritual, with instructions for each product. You can explore the ritual on this site before choosing.' },
  { q: 'Is this a subscription?', a: 'No. This is a one-time kit purchase. There are no automatic refills or recurring charges for you or your partner.' },
  { q: 'Can I send it straight to him?', a: 'You can enter his name and delivery address at checkout, or use your own address to receive it and give it in person. Use your email for the order confirmation and tracking.' },
  { q: 'Will it arrive in time for Christmas?', a: 'Delivery details and any delivery charge are shown at checkout before payment. Orders are sent by Royal Mail Tracked 48. Arrival before Christmas is not guaranteed. Leave extra time for seasonal delays and contact us before ordering if you need help with timing.' },
  { q: 'Does he need a skincare routine already?', a: 'No. SOLUM brings the products and tools together with a guide he can follow. It is body care with a scalp massage step; it does not replace his face care, shampoo or deodorant. If he has known sensitivities, check the ingredients and patch test before use.' },
];

// Keep metadata local to the route and restore it when navigating away.
function useGiftMetadata() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Christmas Gifts for Him | SOLUM Body Care Kits';
    const values = [
      ['meta[name="description"]', 'content', `Give him a body care ritual this Christmas. Explore SOLUM kits, from £${KITS.find(kit => kit.id === 'ground').firstBoxPrice}. One-time purchase with a step-by-step guide.`],
      ['link[rel="canonical"]', 'href', 'https://bysolum.co.uk/gift'],
      ['meta[property="og:title"]', 'content', 'This Christmas. Give him his ritual. | SOLUM'],
      ['meta[property="og:description"]', 'content', 'His Christmas gift, brought together in one SOLUM box. Choose his one-time body care kit.'],
      ['meta[property="og:url"]', 'content', 'https://bysolum.co.uk/gift'],
      ['meta[property="og:image"]', 'content', 'https://bysolum.co.uk/products/kit/box-open.webp'],
    ];
    const previous = values.map(([selector, attribute, value]) => {
      const el = document.querySelector(selector);
      const old = el?.getAttribute(attribute);
      el?.setAttribute(attribute, value);
      return () => { if (el) { if (old === null) el.removeAttribute(attribute); else el.setAttribute(attribute, old); } };
    });
    return () => { document.title = previousTitle; previous.forEach(restore => restore()); };
  }, []);
}

export default function GiftPage() {
  useGiftMetadata();
  const viewed = useRef(false);
  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    capture('gift_page_viewed', { landing_experience: 'christmas_gifting', gift_occasion: 'christmas' });
  }, []);
  const ritual = KITS.find(kit => kit.id === 'ritual');
  const ground = KITS.find(kit => kit.id === 'ground');

  return (
    <div className="gift-page">
      <a className="gift-skip" href="#gift-main">Skip to content</a>
      <Nav links={GIFT_NAV} ctaText="Choose his Christmas gift" localSections />
      <main id="gift-main">
        <Hero
          title={<>This Christmas.<br />Give him the ritual he’s missing.</>}
          description="A complete men’s body care system. Daily wash, exfoliation and a weekly reset, with every step guided."
          ctaLabel="Choose his Christmas gift"
          purchaseNote={`From £${ground.firstBoxPrice} · One-time purchase · No subscription`}
          image={{ src: '/products/kit/holding-box.webp', srcSet: '/products/kit/holding-box@600.webp 600w, /products/kit/holding-box.webp 1600w' }}
        />

        <div className="gift-promise" aria-label="About your gift">
          <span>One complete body care system</span>
          <span>A guide for every step</span>
          <span>A gift he can use every day</span>
        </div>

        <PressSection showPublicationLogos />

        <section className="gift-story gift-section" id="gift-story" aria-labelledby="gift-story-heading">
          <ProductPhotoSwitcher
            label="View the SOLUM box"
            images={[
              { label: 'Inside RITUAL', src: '/products/kit/box-open.webp', srcSet: '/products/kit/box-open@600.webp 600w, /products/kit/box-open.webp 1600w', alt: 'Inside the RITUAL box: the complete SOLUM body care products and tools', width: 1600, height: 2000 },
              { label: 'The box', src: '/products/kit/outer-box.webp', srcSet: '/products/kit/outer-box@600.webp 600w, /products/kit/outer-box.webp 1600w', alt: 'The closed black SOLUM box with blue edging and the SOLUM wordmark', width: 1600, height: 1067 },
            ]}
            caption={`SOLUM box included with either kit. RITUAL shown: ${ritual.productNums.length} pieces · £${ritual.firstBoxPrice}.`}
          />
          <div className="gift-story-copy">
            <h2 id="gift-story-heading">One box.<br />His complete ritual.</h2>
            <p>A box to put under the tree. A body care routine he can make his own.</p>
            <p>Wash, exfoliate, reach his back, massage his scalp and moisturise. Then take time for the weekly clay ritual. The QR code inside the lid shows him how, step by step.</p>
            <dl className="gift-details">
              <div><dt>The box</dt><dd>Black SOLUM packaging, with the products together inside.</dd></div>
              <div><dt>The routine</dt><dd>Daily care and a weekly ritual he can follow at his own pace.</dd></div>
              <div><dt>The choice</dt><dd>Two complete kits. RITUAL adds argan oil and the clay bowl.</dd></div>
            </dl>
            <a className="gift-text-link" href="#kits">Find his kit</a>
          </div>
        </section>

        <WhatSolumIs title="Why give him SOLUM?" pillars={GIFT_PILLARS} />
        <RitualInAction
          compact
          title="See what he’ll actually use."
          description="Daily body care and a weekly reset. Preview the steps; his guide inside the box explains the rest."
        />

        <KitComparison
          title="Choose his Christmas gift."
          description="Both kits give him the daily care and weekly ritual. Choose RITUAL for the added argan oil and clay mixing bowl. One payment. His to keep."
          ctaVerb="Gift"
          checkoutParams={GIFT_CHECKOUT_PARAMS}
        />

        <UnboxingFilm title={<>This is what<br />he’ll open.</>} caption="A closer look at the SOLUM box, products and tools. Choose a kit above to see its full contents." />
        <div id="gift-questions">
          <FAQ items={GIFT_FAQS} title="A few gifting questions." />
        </div>
        <section className="gift-close" aria-labelledby="gift-close-heading">
          <p>This Christmas, make it personal.</p>
          <h2 id="gift-close-heading">His Christmas.<br />Done right.</h2>
          <a className="gift-button" href="#kits">Choose his Christmas gift</a>
          <p className="gift-purchase-note">GROUND £{ground.firstBoxPrice} · RITUAL £{ritual.firstBoxPrice} · One-time purchase</p>
        </section>
      </main>
      <SolumFooter />
      <FounderChat />
    </div>
  );
}
