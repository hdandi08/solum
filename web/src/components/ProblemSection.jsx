import { capture } from '../lib/analytics.js';

const CSS = `
.problem-section{background:var(--black);border-top:1px solid var(--line);padding:64px 48px;}
.problem-inner{max-width:1200px;margin:0 auto;}
.problem-head{max-width:660px;margin-bottom:36px;}
.problem-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:16px;}
.problem-head h2{font-family:'Bebas Neue',sans-serif;font-size:clamp(34px,4vw,60px);letter-spacing:.06em;color:var(--bone);line-height:1.04;margin-bottom:16px;}
.problem-head p{font-size:17px;font-weight:300;color:var(--mist);line-height:1.7;}
.problem-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line);}
.problem-card{background:var(--char);padding:24px 22px;}
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
  .problem-section{padding:48px 20px;}
  .problem-grid{grid-template-columns:1fr;}
  .problem-card{padding:20px;}
  .problem-fix{padding:24px 20px;}
  .problem-fix p{font-size:15px;}
}
`;

const SYMPTOMS = [
  ['/icons/problem-odour.webp', 'Freshness that lasts', 'Feel properly clean for longer than the first hour after a shower.'],
  ['/icons/problem-rough.webp', 'Smoother skin you can feel', 'Arms, shoulders and thighs stop feeling rough, dull and neglected.'],
  ['/icons/problem-back.webp', 'A back that feels properly clean', 'The place most routines miss finally feels as clean as your chest and arms.'],
  ['/icons/problem-scalp.webp', 'A scalp that feels lighter', 'Less scalp odour, less buildup and hair that feels cleaner at the root.'],
  ['/icons/problem-gym.webp', 'A better post-training reset', 'Freshness that survives the towel, the commute and the rest of the day.'],
  ['/icons/problem-drop.webp', 'Comfort without the swing', 'Comfortable skin that does not swing from tight to greasy by lunchtime.'],
];

export default function ProblemSection() {
  return (
    <>
      <style>{CSS}</style>
      <section className="problem-section" id="problem" data-track="problem">
        <div className="problem-inner">
          <div className="problem-head reveal">
            <div className="problem-tag">The missing step</div>
            <h2>A shower cleans the surface.<br />A ritual changes the result.</h2>
            <p>Most men do not need more products. They need a system that leaves the body smoother, fresher and properly cared for after the shower.</p>
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
            <p>Body care has been treated like a product shelf. <strong>SOLUM turns the shower you already take into a result you can feel: cleaner back, smoother skin, fresher scalp and lasting comfort.</strong></p>
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
