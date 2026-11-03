import { capture } from '../lib/analytics.js';

const CSS = `
.system-section{background:var(--black);padding:64px 0;border-top:1px solid var(--line);}
.system-inner{max-width:1120px;margin:0 auto;padding:0 48px;}
.system-kicker{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:14px;}
.system-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(34px,4vw,50px);letter-spacing:.05em;color:var(--bone);line-height:.98;margin:0 0 12px;}
.system-sub{max-width:560px;color:rgba(240,236,226,.68);font-size:16px;line-height:1.55;font-weight:300;margin:0 0 30px;}
.sequence-proof{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border:1px solid rgba(240,236,226,.12);background:rgba(8,9,11,.42);}
.sequence-card{min-height:250px;padding:26px;border-left:1px solid rgba(240,236,226,.1);display:flex;flex-direction:column;justify-content:space-between;gap:22px;}
.sequence-card:first-child{border-left:none;}
.sequence-card.old{background:rgba(24,28,36,.5);}
.sequence-card.new{background:linear-gradient(145deg,rgba(18,35,58,.92),rgba(8,9,11,.58));}
.sequence-card.result{background:radial-gradient(circle at 18% 14%,rgba(74,143,199,.2),rgba(8,9,11,.68) 45%);}
.sequence-label{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--blit);font-weight:700;}
.sequence-card.old .sequence-label{color:rgba(240,236,226,.46);}
.sequence-copy{font-family:'Bebas Neue',sans-serif;font-size:clamp(27px,3vw,38px);letter-spacing:.05em;color:var(--bone);line-height:1;}
.sequence-note{font-size:14px;color:rgba(240,236,226,.64);font-weight:300;line-height:1.5;margin:0;}
.sequence-closing{margin:24px 0 0;color:var(--mist);font-size:16px;line-height:1.5;font-weight:300;}
.sequence-cta{margin-top:20px;display:flex;justify-content:flex-start;}
@media(max-width:768px){
  .system-section{padding:56px 0;}
  .system-inner{padding:0 24px;}
  .sequence-proof{grid-template-columns:1fr;}
  .sequence-card{min-height:auto;border-left:none;border-top:1px solid rgba(240,236,226,.1);padding:22px;}
  .sequence-card:first-child{border-top:none;}
  .sequence-cta{justify-content:center;}
}
`;

const SEQUENCE_CARDS = [
  {
    className: 'old',
    label: 'Formulas',
    copy: 'Formulas with purpose.',
    note: 'Sulphate-free amino acid body wash cleans without the tight after-feel. Fast-absorbing lotion leaves skin comfortable.',
  },
  {
    className: 'new',
    label: 'Tools',
    copy: 'Tools that make the difference.',
    note: 'The exfoliating mitt lifts surface buildup. The back cloth reaches properly. Flexible silicone pins work through scalp buildup.',
  },
  {
    className: 'result',
    label: 'Ingredients',
    copy: 'Pure ingredients. Proper finish.',
    note: 'Mineral-rich Moroccan clay for the weekly reset. Single-ingredient, certified organic argan oil for a soft, comfortable finish.',
  },
];

export default function SystemSection() {
  return (
    <>
      <style>{CSS}</style>
      <section className="system-section" id="system">
        <div className="system-inner">
          <div className="system-kicker reveal">The SOLUM standard</div>
          <h2 className="system-title reveal">Better products. One complete ritual.</h2>
          <p className="system-sub reveal">
            Body care developed for SOLUM, tools that reach what hands miss, and a daily and weekly routine built for men.
          </p>
          <div className="sequence-proof reveal">
            {SEQUENCE_CARDS.map((card) => (
              <article className={`sequence-card ${card.className}`} key={card.label}>
                <div className="sequence-label">{card.label}</div>
                <div className="sequence-copy">{card.copy}</div>
                <p className="sequence-note">{card.note}</p>
              </article>
            ))}
          </div>
          <p className="sequence-closing reveal">Every product has a job. The ritual brings them together.</p>
          <div className="sequence-cta reveal">
            <a href="#kits" className="btn-primary" onClick={() => capture('system_cta_clicked')}>Choose your kit</a>
          </div>
        </div>
      </section>
    </>
  );
}
