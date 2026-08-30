import { capture } from '../lib/analytics.js';

const CSS = `
.system-section{background:var(--black);padding:72px 0;border-top:1px solid var(--line);}
.system-inner{max-width:1120px;margin:0 auto;padding:0 48px;}
.system-kicker{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:14px;}
.system-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(34px,4.5vw,58px);letter-spacing:.05em;color:var(--bone);line-height:.98;margin:0 0 14px;}
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
.sequence-cta{margin-top:30px;display:flex;justify-content:flex-start;}
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
    label: 'Old shower',
    copy: 'One bottle, hands, hot water.',
    note: 'It can feel clean for a moment while the back, scalp and rougher skin stay under-served.',
  },
  {
    className: 'new',
    label: 'SOLUM sequence',
    copy: 'Scalp first. Wash. Reach the back. Reset weekly. Finish damp.',
    note: 'The daily ritual maintains. The weekly ritual resets. The order is the point.',
  },
  {
    className: 'result',
    label: 'What changes',
    copy: 'Cleaner roots, a properly reached back, smoother skin and a calmer finish after towelling.',
    note: 'Products matter, but the system is what makes each product make sense.',
  },
];

export default function SystemSection() {
  return (
    <>
      <style>{CSS}</style>
      <section className="system-section" id="system">
        <div className="system-inner">
          <div className="system-kicker reveal">Why the order matters</div>
          <h2 className="system-title reveal">The result comes from sequence.</h2>
          <p className="system-sub reveal">
            SOLUM is not a shelf of products. It is a daily and weekly order for the parts of the body most routines miss.
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
          <div className="sequence-cta reveal">
            <a href="#kits" className="btn-primary" onClick={() => capture('system_cta_clicked')}>Choose your kit</a>
          </div>
        </div>
      </section>
    </>
  );
}
