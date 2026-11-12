import { useState } from 'react';
import { KITS } from '../data/kits.js';
import './WhatsInside.css';

const INSIDE_ALT = "What's inside the SOLUM Ritual Kit: body wash, soft cleansing cloth, back scrub cloth, scalp massager, body lotion, Italy towel mitt, Atlas clay mask, argan body oil, mixing bowl and a step-by-step guide.";
const DAILY = [
  ['Body wash', 'Sulphate-free, pH 4.5'],
  ['Soft cleansing cloth', 'Gentle daily lather'],
  ['Back scrub cloth', '90cm, reaches your whole back'],
  ['Scalp massager', 'For a proper scalp wash'],
  ['Body lotion', 'Daily moisture with CoQ10'],
];
const WEEKLY = [
  ['Italy towel mitt', 'Weekly exfoliation'],
  ['Atlas clay mask', 'Weekly deep cleanse'],
  ['Argan body oil', 'Mix into the clay, or finish with it'],
  ['Mixing bowl', 'For your weekly clay'],
];
export default function WhatsInside() {
  const [galleryImage, setGalleryImage] = useState(1);
  const ritual = KITS.find(kit => kit.id === 'ritual');
  return <div className="buy-landing home-whats-inside" id="whats-inside" data-track="whats_inside">
    <section className="buy-inside" aria-labelledby="buy-inside-title">
      <div className="buy-section-heading"><h2 id="buy-inside-title">What's inside</h2><p>The complete Ritual Kit. £85.</p></div>
      <div className="buy-inside-grid">
        <div className="buy-gallery">
          <img className="buy-gallery-main" src={galleryImage === 0 ? ritual.image : '/products/kit/ritual-whats-inside.webp'} alt={galleryImage === 0 ? 'The complete SOLUM Ritual Kit in its presentation box' : INSIDE_ALT} width="1080" height="1350" loading="lazy" decoding="async" />
          <div className="buy-gallery-thumbs" aria-label="Ritual Kit images">
            {[ritual.image, '/products/kit/ritual-whats-inside.webp'].map((src, index) => <button key={src} type="button" aria-label={index === 0 ? 'Show Ritual Kit' : "Show what's inside"} aria-pressed={galleryImage === index} onClick={() => setGalleryImage(index)}><img src={src} alt="" width="64" height="80" loading="lazy" /></button>)}
          </div>

        </div>
        <div className="buy-contents">
          {[["Daily", DAILY, 1], ["Weekly", WEEKLY, 6]].map(([title, items, start]) => <div key={title}><h3>{title}</h3><ol start={start}>{items.map(([name, description]) => <li key={name}><strong>{name}:</strong> {description}</li>)}</ol></div>)}
          <p className="buy-guide-note"><strong>Plus a step-by-step guide.</strong> Scan the QR code in the lid.</p>
        </div>
      </div>
    </section>
  </div>;
}
