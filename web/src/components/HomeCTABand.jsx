import { useNavigate } from 'react-router-dom';
import { KITS, kitWorth } from '../data/kits.js';
import { capture } from '../lib/analytics.js';
import { trackAddToCart } from '../lib/addToCartTracker.js';

const CSS = `
.home-ctaband{background:var(--char);border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:52px 24px;}
.home-ctaband-inner{max-width:640px;margin:0 auto;text-align:center;}
.home-ctaband-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(26px,3vw,38px);letter-spacing:.06em;color:var(--bone);line-height:1.05;margin:0 0 10px;}
.home-ctaband-title span{color:var(--blit);}
.home-ctaband-value{font-size:16px;color:var(--mist);font-weight:300;line-height:1.55;margin:0 0 24px;}
.home-ctaband-value strong{color:var(--bone);font-weight:600;}
.home-ctaband-buttons{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;}
.home-ctaband-buy{font-family:'Bebas Neue',sans-serif;font-size:17px;letter-spacing:.12em;background:var(--bone);color:var(--black);border:none;padding:16px 30px;cursor:pointer;transition:background .2s,transform .15s;}
.home-ctaband-buy:hover{background:#fff;transform:translateY(-1px);}
.home-ctaband-ground{font-family:'Bebas Neue',sans-serif;font-size:17px;letter-spacing:.12em;background:none;color:var(--bone);border:1px solid var(--lineb);padding:16px 30px;cursor:pointer;transition:border-color .2s,color .2s;}
.home-ctaband-ground:hover{border-color:var(--blue);}
.home-ctaband-trust{margin-top:18px;font-size:13px;color:var(--stone);font-weight:300;letter-spacing:.3px;}
@media(max-width:640px){
  .home-ctaband-buttons{flex-direction:column;}
  .home-ctaband-buy,.home-ctaband-ground{width:100%;}
}
`;

// Conversion band after the ritual film: the visitor has just seen the system in
// action — this is the value maths plus a direct path to /buy for both kits.
export default function HomeCTABand() {
  const navigate = useNavigate();
  const ritual = KITS.find(k => k.id === 'ritual');
  const ground = KITS.find(k => k.id === 'ground');

  const buy = (kit) => {
    capture('ctaband_buy_clicked', { kit: kit.id });
    trackAddToCart(kit.id);
    navigate(`/buy?kit=${kit.id}`);
  };

  return (
    <>
      <style>{CSS}</style>
      <section className="home-ctaband" id="ritual-cta">
        <div className="home-ctaband-inner reveal">
          <h2 className="home-ctaband-title">Ten minutes a day.<br /><span>Everything changes.</span></h2>
          <p className="home-ctaband-value">
            <strong>£{kitWorth(ritual)} of product · you pay £{ritual.firstBoxPrice}.</strong><br />
            Tools last 6 to 12 months. First batch · only 250 kits made.
          </p>
          <div className="home-ctaband-buttons">
            <button type="button" className="home-ctaband-buy" data-buy-cta={`/buy?kit=${ritual.id}`} onClick={() => buy(ritual)}>
              Buy {ritual.name} · £{ritual.firstBoxPrice}
            </button>
            <button type="button" className="home-ctaband-ground" data-buy-cta={`/buy?kit=${ground.id}`} onClick={() => buy(ground)}>
              Start with {ground.name} · £{ground.firstBoxPrice}
            </button>
          </div>
          <div className="home-ctaband-trust">🚚 Free UK delivery · ✓ 14-day returns · 🔒 Secured by Stripe</div>
        </div>
      </section>
    </>
  );
}
