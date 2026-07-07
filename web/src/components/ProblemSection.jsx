import { capture } from '../lib/analytics.js';

const CSS = `
.problem-section{background:var(--black);border-top:1px solid var(--line);padding:100px 48px;}
.problem-inner{max-width:1200px;margin:0 auto;}
.problem-head{max-width:660px;margin-bottom:52px;}
.problem-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:16px;}
.problem-head h2{font-family:'Bebas Neue',sans-serif;font-size:clamp(34px,4vw,60px);letter-spacing:.06em;color:var(--bone);line-height:1.04;margin-bottom:16px;}
.problem-head p{font-size:17px;font-weight:300;color:var(--mist);line-height:1.7;}
.problem-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line);}
.problem-card{background:var(--char);padding:30px 26px;}
.problem-card-ic{width:48px;height:48px;display:block;margin-bottom:14px;}
.problem-card h3{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:20px;color:var(--bone);line-height:1.2;margin-bottom:10px;}
.problem-card p{font-size:15px;font-weight:300;color:var(--mist);line-height:1.6;}
.problem-fix{background:var(--mid);border:1px solid var(--blue);padding:32px;margin-top:24px;}
.problem-fix p{font-size:17px;font-weight:300;color:var(--bone);line-height:1.7;}
.problem-fix strong{font-weight:600;}
.problem-cta-row{margin-top:20px;display:flex;}
@media(max-width:600px){.problem-cta-row .btn-primary{width:100%;text-align:center;}}
@media(max-width:900px){.problem-grid{grid-template-columns:repeat(2,1fr);}}
@media(max-width:600px){
  .problem-section{padding:56px 20px;}
  .problem-grid{grid-template-columns:1fr;}
  .problem-fix{padding:24px 20px;}
  .problem-fix p{font-size:15px;}
}
`;

const SYMPTOMS = [
  ['/icons/problem-odour.webp', 'Odour back by midday', 'You showered this morning. By lunch you catch yourself again.'],
  ['/icons/problem-rough.webp', 'Rough, bumpy skin', 'Arms, shoulders, thighs. Years of dead skin nobody taught you to remove.'],
  ['/icons/problem-back.webp', 'A back you can\'t reach', 'Breakouts and buildup exactly where your hands never get to.'],
  ['/icons/problem-scalp.webp', 'An itchy, flaky scalp', 'Washed with shampoo every day, never actually cleaned.'],
  ['/icons/problem-gym.webp', 'Never clean after the gym', 'The sweat rinses off. What causes the smell does not.'],
  ['/icons/problem-drop.webp', 'Tight and dry, then greasy', 'Your skin never settles. It just swings from one to the other.'],
];

export default function ProblemSection() {
  return (
    <>
      <style>{CSS}</style>
      <section className="problem-section" id="problem" data-track="problem">
        <div className="problem-inner">
          <div className="problem-head reveal">
            <div className="problem-tag">It isn't hygiene.</div>
            <h2>You do everything right.<br />You still don't feel clean.</h2>
            <p>If any of these sound familiar, it isn't you. It's the routine nobody ever fixed.</p>
          </div>
          <div className="problem-grid reveal">
            {SYMPTOMS.map(([src, title, body]) => (
              <div key={title} className="problem-card">
                <img src={src} className="problem-card-ic" alt="" aria-hidden="true" loading="lazy" />
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
          <div className="problem-fix reveal">
            <p>None of this is poor hygiene. A shower only wets the surface. Dead skin builds up for years and bacteria feed on it. <strong>SOLUM is the 10-minute system that clears it, head to toe.</strong></p>
          </div>
          <div className="problem-cta-row reveal">
            <a href="#kits" className="btn-primary" onClick={() => capture('problem_cta_clicked')}>
              See the Kits →
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
