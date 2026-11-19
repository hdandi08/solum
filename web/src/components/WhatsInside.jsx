import { KITS } from '../data/kits.js';
import './WhatsInside.css';

const DAILY = [['01', 'Body wash'], ['08', 'Soft cleansing cloth'], ['03', 'Back scrub cloth'], ['04', 'Scalp massager'], ['07', 'Body lotion']];
const WEEKLY = [['02', 'Italy towel mitt'], ['05', 'Atlas clay mask'], ['06', 'Argan body oil'], ['11', 'Mixing bowl']];

export default function WhatsInside() {
  const ritual = KITS.find(kit => kit.id === 'ritual');
  return (
    <section className="home-whats-inside" id="whats-inside" data-track="whats_inside" aria-labelledby="inside-title">
      <div className="inside-inner">
        <header className="inside-heading">
          <p className="inside-kicker">What's inside</p>
          <h2 id="inside-title">You won’t use everything at once.</h2>
          <p className="inside-product-key">Colour-coded and numbered for daily care and your weekly reset.</p>
        </header>
        <div className="inside-layout">
          <article className="inside-routine" aria-labelledby="inside-daily-heading">
            <div className="inside-routine-heading"><h3 id="inside-daily-heading">Your daily essentials</h3><span className="inside-duration"><strong>10</strong><span>min · Daily</span></span></div>
            <figure className="inside-photograph">
              <img src="/products/kit/daily-original-collage.webp" srcSet="/products/kit/daily-original-collage@900.webp 900w, /products/kit/daily-original-collage.webp 1800w" sizes="(max-width: 760px) calc(100vw - 48px), 50vw" alt="Original photos of 01 Body Wash, 03 Back Scrub Cloth in use, 04 Scalp Massager, 08 Soft Cleansing Cloth and 07 Body Lotion" width="1800" height="1000" loading="lazy" decoding="async" />
            </figure>
            <p>Cleanse, reach and hydrate. Care that fits into the shower you already take.</p>
          </article>
          <article className="inside-routine inside-weekly" aria-labelledby="inside-weekly-heading">
            <div className="inside-routine-heading"><h3 id="inside-weekly-heading">Your at-home spa reset</h3><span className="inside-duration"><strong>22</strong><span>min · Weekly</span></span></div>
            <figure className="inside-photograph">
              <img src="/products/kit/weekly-original-collage.webp" srcSet="/products/kit/weekly-original-collage@900.webp 900w, /products/kit/weekly-original-collage.webp 1800w" sizes="(max-width: 760px) calc(100vw - 48px), 50vw" alt="Original photos of 05 Atlas Clay Mask, 06 Argan Body Oil, 11 Mixing Bowl and the actual 02 Italy Towel Mitt in use" width="1800" height="1000" loading="lazy" decoding="async" />
            </figure>
            <p>Earthy clay. Warm water. Slow exfoliation. A nourishing oil finish. Twenty-two minutes to reconnect with yourself.</p>
            <p className="inside-cadence-note">Replaces your daily routine once a week.</p>
          </article>
        </div>
        <div className="inside-footer">
          <div className="inside-guidance">
            <h3>A clear guide. Every step.</h3>
            <p>Scan the QR code in your box to see what to use, when and how. Follow along until it feels familiar.</p>
          </div>
          <div>
            <p className="inside-kit-caption">The complete RITUAL Kit <span>£{ritual.firstBoxPrice}</span></p>
            <details className="inside-contents">
              <summary>See everything included</summary>
              <div className="inside-contents-grid">
                {[["Daily essentials", DAILY], ["Weekly care", WEEKLY]].map(([title, items]) => (
                  <div key={title} className={title === 'Weekly care' ? 'inside-contents-weekly' : undefined}><h4>{title}</h4><ul>{items.map(([num, name]) => <li key={num}><span className="inside-product-num">{num}</span><span>{name}</span></li>)}</ul></div>
                ))}
              </div>
              <p className="inside-contents-guide">Step-by-step guide included.</p>
            </details>
          </div>
        </div>
      </div>
    </section>
  );
}
