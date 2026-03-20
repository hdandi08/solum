import { PRODUCTS } from '../data/products.js';

const CSS = `
.products-section{background:var(--black);padding:80px 48px;border-top:1px solid var(--line);}
.products-header{max-width:1400px;margin:0 auto 64px;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:start;}
.products-header .p-sec-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blue);font-weight:600;margin-bottom:16px;}
.products-header .p-sec-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,4vw,64px);letter-spacing:.06em;color:var(--bone);line-height:1.05;margin-bottom:0;}
.products-header .p-sec-body{font-size:16px;color:var(--mist);font-weight:300;line-height:1.7;}
.products-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--line);max-width:1400px;margin:0 auto;}
.product-card{background:var(--char);padding:32px 24px;display:flex;flex-direction:column;position:relative;overflow:hidden;transition:background .25s;}
.product-card:hover{background:var(--mid);}
.product-card.coming-soon .prod-visual{opacity:0.45;}
.prod-num{font-family:'Bebas Neue',sans-serif;font-size:56px;letter-spacing:-2px;color:rgba(46,109,164,0.1);line-height:1;margin-bottom:12px;}
.prod-origin{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--blue);margin-bottom:8px;font-weight:600;}
.prod-name{font-size:14px;letter-spacing:2px;text-transform:uppercase;color:var(--bone);font-weight:600;line-height:1.35;margin-bottom:16px;}
.prod-visual{width:100%;aspect-ratio:3/4;border:1px solid var(--line);background:var(--dark);display:flex;align-items:center;justify-content:center;margin-bottom:16px;position:relative;overflow:hidden;transition:border-color .25s;}
.prod-visual::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 30%,rgba(46,109,164,0.07),transparent 65%);}
.prod-visual svg{width:65%;height:65%;opacity:.75;position:relative;z-index:1;}
.prod-soon-badge{position:absolute;top:12px;left:12px;font-size:9px;letter-spacing:3px;text-transform:uppercase;background:var(--blue);color:var(--bone);padding:3px 8px;font-weight:700;z-index:2;}
.prod-body-tag{display:inline-flex;align-items:center;gap:6px;margin-bottom:10px;}
.pbt-dot{width:5px;height:5px;border-radius:50%;background:var(--blue);flex-shrink:0;}
.pbt-text{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--blue);font-weight:600;}
.prod-desc{font-size:14px;color:var(--stone);line-height:1.6;font-weight:300;margin-top:auto;}
.reveal{opacity:0;transform:translateY(32px);transition:opacity .7s ease,transform .7s ease;}
.reveal.visible{opacity:1;transform:translateY(0);}
@media(max-width:768px){.products-grid{grid-template-columns:repeat(2,1fr);}.products-header{grid-template-columns:1fr;gap:24px;}.products-section{padding:60px 24px;}}
`;

const SVGS = {
  '01': <svg viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="28" y="50" width="44" height="90" rx="6" stroke="#4a8fc7" strokeWidth="1.5"/><rect x="38" y="30" width="24" height="22" rx="4" stroke="#4a8fc7" strokeWidth="1.2"/><rect x="46" y="18" width="8" height="14" rx="2" stroke="#4a8fc7" strokeWidth="1.2"/><line x1="54" y1="22" x2="70" y2="22" stroke="#4a8fc7" strokeWidth="1.2"/><circle cx="70" cy="22" r="4" stroke="#4a8fc7" strokeWidth="1.2"/><line x1="36" y1="80" x2="64" y2="80" stroke="#2e6da4" strokeWidth="0.8" opacity="0.5"/><line x1="36" y1="90" x2="58" y2="90" stroke="#2e6da4" strokeWidth="0.8" opacity="0.3"/><rect x="34" y="100" width="32" height="2" rx="1" fill="#2e6da4" opacity="0.4"/><text x="50" y="120" textAnchor="middle" fontFamily="sans-serif" fontSize="7" fill="#4a8fc7" opacity="0.6" letterSpacing="1">250ml</text></svg>,
  '02': <svg viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M25,90 Q22,60 30,40 Q38,20 50,22 Q62,20 70,40 Q78,60 75,90 Q72,120 50,130 Q28,120 25,90Z" stroke="#4a8fc7" strokeWidth="1.5"/><line x1="35" y1="50" x2="65" y2="50" stroke="#2e6da4" strokeWidth="0.8" opacity="0.5"/><line x1="33" y1="62" x2="67" y2="62" stroke="#2e6da4" strokeWidth="0.8" opacity="0.5"/><line x1="32" y1="74" x2="68" y2="74" stroke="#2e6da4" strokeWidth="0.8" opacity="0.5"/><line x1="32" y1="86" x2="68" y2="86" stroke="#2e6da4" strokeWidth="0.8" opacity="0.4"/><line x1="33" y1="98" x2="67" y2="98" stroke="#2e6da4" strokeWidth="0.8" opacity="0.3"/><text x="50" y="150" textAnchor="middle" fontFamily="sans-serif" fontSize="6.5" fill="#4a8fc7" opacity="0.6" letterSpacing="1">ITALY TOWEL</text></svg>,
  '03': <svg viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="42" y="15" width="16" height="20" rx="3" stroke="#4a8fc7" strokeWidth="1.3"/><rect x="42" y="125" width="16" height="20" rx="3" stroke="#4a8fc7" strokeWidth="1.3"/><rect x="35" y="33" width="30" height="94" rx="2" stroke="#4a8fc7" strokeWidth="1.5"/><line x1="35" y1="46" x2="65" y2="46" stroke="#2e6da4" strokeWidth="0.7" opacity="0.5"/><line x1="35" y1="57" x2="65" y2="57" stroke="#2e6da4" strokeWidth="0.7" opacity="0.5"/><line x1="35" y1="68" x2="65" y2="68" stroke="#2e6da4" strokeWidth="0.7" opacity="0.5"/><line x1="35" y1="79" x2="65" y2="79" stroke="#2e6da4" strokeWidth="0.7" opacity="0.4"/><line x1="35" y1="90" x2="65" y2="90" stroke="#2e6da4" strokeWidth="0.7" opacity="0.3"/><text x="50" y="155" textAnchor="middle" fontFamily="sans-serif" fontSize="6.5" fill="#4a8fc7" opacity="0.6" letterSpacing="1">70CM REACH</text></svg>,
  '04': <svg viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="65" r="32" stroke="#4a8fc7" strokeWidth="1.5"/><circle cx="50" cy="65" r="22" stroke="#2e6da4" strokeWidth="0.8" opacity="0.4"/><circle cx="50" cy="43" r="3" stroke="#4a8fc7" strokeWidth="1.2"/><circle cx="64" cy="50" r="3" stroke="#4a8fc7" strokeWidth="1.2"/><circle cx="68" cy="65" r="3" stroke="#4a8fc7" strokeWidth="1.2"/><circle cx="64" cy="80" r="3" stroke="#4a8fc7" strokeWidth="1.2"/><circle cx="50" cy="87" r="3" stroke="#4a8fc7" strokeWidth="1.2"/><circle cx="36" cy="80" r="3" stroke="#4a8fc7" strokeWidth="1.2"/><circle cx="32" cy="65" r="3" stroke="#4a8fc7" strokeWidth="1.2"/><circle cx="36" cy="50" r="3" stroke="#4a8fc7" strokeWidth="1.2"/><rect x="44" y="97" width="12" height="34" rx="6" stroke="#4a8fc7" strokeWidth="1.3"/></svg>,
  '05': <svg viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="55" width="60" height="72" rx="4" stroke="#4a8fc7" strokeWidth="1.5"/><rect x="18" y="42" width="64" height="16" rx="3" stroke="#4a8fc7" strokeWidth="1.3"/><line x1="28" y1="78" x2="72" y2="78" stroke="#2e6da4" strokeWidth="0.7" opacity="0.4"/><line x1="28" y1="91" x2="72" y2="91" stroke="#2e6da4" strokeWidth="0.7" opacity="0.4"/><line x1="28" y1="104" x2="72" y2="104" stroke="#2e6da4" strokeWidth="0.7" opacity="0.4"/><text x="50" y="73" textAnchor="middle" fontFamily="sans-serif" fontSize="6" fill="#4a8fc7" opacity="0.7" letterSpacing="1">ATLAS CLAY</text><text x="50" y="148" textAnchor="middle" fontFamily="sans-serif" fontSize="6.5" fill="#4a8fc7" opacity="0.6" letterSpacing="1">MOROCCO</text></svg>,
  '06': <svg viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="32" y="60" width="36" height="78" rx="5" stroke="#4a8fc7" strokeWidth="1.5"/><rect x="40" y="40" width="20" height="22" rx="3" stroke="#4a8fc7" strokeWidth="1.2"/><ellipse cx="50" cy="36" rx="10" ry="6" stroke="#4a8fc7" strokeWidth="1.2"/><line x1="50" y1="18" x2="50" y2="30" stroke="#4a8fc7" strokeWidth="1.2"/><circle cx="50" cy="16" r="3" stroke="#4a8fc7" strokeWidth="1.2"/><text x="50" y="80" textAnchor="middle" fontFamily="sans-serif" fontSize="6" fill="#4a8fc7" opacity="0.6" letterSpacing="1">ARGAN</text><text x="50" y="148" textAnchor="middle" fontFamily="sans-serif" fontSize="6.5" fill="#4a8fc7" opacity="0.6" letterSpacing="1">COLD PRESSED</text></svg>,
  '07': <svg viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M34,145 L30,60 Q30,50 50,48 Q70,50 70,60 L66,145 Z" stroke="#4a8fc7" strokeWidth="1.5"/><rect x="38" y="36" width="24" height="14" rx="4" stroke="#4a8fc7" strokeWidth="1.3"/><line x1="32" y1="85" x2="68" y2="85" stroke="#2e6da4" strokeWidth="0.8" opacity="0.5"/><text x="50" y="94" textAnchor="middle" fontFamily="sans-serif" fontSize="6" fill="#4a8fc7" opacity="0.7" letterSpacing="1">400ml</text><text x="50" y="155" textAnchor="middle" fontFamily="sans-serif" fontSize="6.5" fill="#4a8fc7" opacity="0.6" letterSpacing="1">BODY ONLY</text></svg>,
  '08': <svg viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="22" y="38" width="56" height="84" rx="8" stroke="#4a8fc7" strokeWidth="1.5"/><rect x="30" y="46" width="40" height="68" rx="5" stroke="#2e6da4" strokeWidth="0.8" opacity="0.4"/><line x1="30" y1="58" x2="70" y2="58" stroke="#2e6da4" strokeWidth="0.6" opacity="0.45"/><line x1="30" y1="70" x2="70" y2="70" stroke="#2e6da4" strokeWidth="0.6" opacity="0.4"/><line x1="30" y1="82" x2="70" y2="82" stroke="#2e6da4" strokeWidth="0.6" opacity="0.35"/><line x1="30" y1="94" x2="70" y2="94" stroke="#2e6da4" strokeWidth="0.6" opacity="0.3"/><text x="50" y="30" textAnchor="middle" fontFamily="sans-serif" fontSize="6" fill="#4a8fc7" opacity="0.7" letterSpacing="1">BAMBOO</text><text x="50" y="148" textAnchor="middle" fontFamily="sans-serif" fontSize="6.5" fill="#4a8fc7" opacity="0.6" letterSpacing="1">ULTRA SOFT</text></svg>,
  '09': <svg viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M25,90 Q22,60 30,40 Q38,20 50,22 Q62,20 70,40 Q78,60 75,90 Q72,120 50,130 Q28,120 25,90Z" stroke="#4a8fc7" strokeWidth="1.5" strokeDasharray="4 2"/><text x="50" y="85" textAnchor="middle" fontFamily="sans-serif" fontSize="7" fill="#4a8fc7" opacity="0.5" letterSpacing="1">ARTISAN</text><text x="50" y="150" textAnchor="middle" fontFamily="sans-serif" fontSize="6.5" fill="#4a8fc7" opacity="0.5" letterSpacing="1">TURKEY</text></svg>,
  '10': <svg viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="28" y="48" width="44" height="64" rx="4" stroke="#4a8fc7" strokeWidth="1.5" strokeDasharray="4 2"/><text x="50" y="85" textAnchor="middle" fontFamily="sans-serif" fontSize="7" fill="#4a8fc7" opacity="0.5" letterSpacing="1">BLACK SOAP</text><text x="50" y="148" textAnchor="middle" fontFamily="sans-serif" fontSize="6.5" fill="#4a8fc7" opacity="0.5" letterSpacing="1">TURKEY</text></svg>,
};

export default function ProductLineup() {
  return (
    <>
      <style>{CSS}</style>
      <section className="products-section" id="products">
        <div className="products-header reveal">
          <div>
            <div className="p-sec-tag">The Products</div>
            <h2 className="p-sec-title">Ten Products.<br />One Body System.</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <p className="p-sec-body">
              Each product is numbered 01–10 and used in sequence. All ten address the body — not the face.
              Sourced from the country that does each tradition best. Products 09 and 10 are coming soon.
            </p>
          </div>
        </div>
        <div className="products-grid reveal">
          {PRODUCTS.map(p => (
            <div key={p.num} className={`product-card${p.comingSoon ? ' coming-soon' : ''}`}>
              <div className="prod-num">{p.num}</div>
              <div className="prod-origin">{p.origin}</div>
              <div className="prod-name">{p.name}</div>
              <div className="prod-visual">
                {p.comingSoon && <div className="prod-soon-badge">Soon</div>}
                {SVGS[p.num]}
              </div>
              <div className="prod-body-tag">
                <div className="pbt-dot" />
                <span className="pbt-text">{p.tag}</span>
              </div>
              <div className="prod-desc">{p.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
