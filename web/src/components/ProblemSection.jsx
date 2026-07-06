const CSS = `
.problem-section{background:var(--black);border-top:1px solid var(--line);padding:100px 48px;}
.problem-inner{max-width:1200px;margin:0 auto;}
.problem-head{max-width:660px;margin-bottom:52px;}
.problem-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:16px;}
.problem-head h2{font-family:'Bebas Neue',sans-serif;font-size:clamp(34px,4vw,60px);letter-spacing:.06em;color:var(--bone);line-height:1.04;margin-bottom:16px;}
.problem-head p{font-size:17px;font-weight:300;color:var(--mist);line-height:1.7;}
.problem-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line);}
.problem-card{background:var(--char);padding:30px 26px;}
.problem-card-ic{color:var(--blit);display:block;margin-bottom:16px;}
.problem-card h3{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:20px;color:var(--bone);line-height:1.2;margin-bottom:10px;}
.problem-card p{font-size:15px;font-weight:300;color:var(--mist);line-height:1.6;}
.problem-fix{background:var(--mid);border:1px solid var(--blue);padding:32px;margin-top:24px;}
.problem-fix p{font-size:17px;font-weight:300;color:var(--bone);line-height:1.7;}
.problem-fix strong{font-weight:600;}
@media(max-width:900px){.problem-grid{grid-template-columns:repeat(2,1fr);}}
@media(max-width:600px){
  .problem-section{padding:56px 20px;}
  .problem-grid{grid-template-columns:1fr;}
  .problem-fix{padding:24px 20px;}
  .problem-fix p{font-size:15px;}
}
`;

const S = { width: 30, height: 30, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', className: 'problem-card-ic', 'aria-hidden': true };
const dot = (cx, cy) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="0.8" fill="currentColor" stroke="none" />;

// Odour — rising scent waves
const IconOdour = () => (
  <svg {...S}><path d="M8 21c-1.4-1.6 1.4-3.2 0-4.8s1.4-3.2 0-4.8" /><path d="M12 21c-1.4-1.6 1.4-3.2 0-4.8s1.4-3.2 0-4.8" /><path d="M16 21c-1.4-1.6 1.4-3.2 0-4.8s1.4-3.2 0-4.8" /></svg>
);
// Rough, bumpy skin — bumpy surface + texture
const IconRough = () => (
  <svg {...S}><path d="M3 16.5c1.4 0 1.4-3 2.8-3s1.4 3 2.8 3 1.4-3 2.8-3 1.4 3 2.8 3 1.4-3 2.8-3 1.4 3 2.8 3" />{dot(7, 8)}{dot(12, 6.5)}{dot(16.5, 8)}</svg>
);
// A back you can't reach — figure from behind
const IconBack = () => (
  <svg {...S}><circle cx="12" cy="7" r="3.2" /><path d="M5.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" /></svg>
);
// Itchy, flaky scalp — head dome + flakes
const IconScalp = () => (
  <svg {...S}><path d="M6 15a6 6 0 0 1 12 0" /><path d="M5 15h14" />{dot(9, 6.5)}{dot(13, 5.5)}{dot(16, 7.5)}</svg>
);
// Never clean after the gym — dumbbell
const IconGym = () => (
  <svg {...S}><path d="M6.5 7v10M17.5 7v10" /><path d="M4 9.5v5M20 9.5v5" /><path d="M6.5 12h11" /></svg>
);
// Tight then greasy — droplet
const IconDrop = () => (
  <svg {...S}><path d="M12 3.5c3 4.2 5 7 5 9.8a5 5 0 0 1-10 0c0-2.8 2-5.6 5-9.8z" /><path d="M9.6 14a2.4 2.4 0 0 0 1.7 2.3" /></svg>
);

const SYMPTOMS = [
  [<IconOdour />, 'Odour back by midday', 'You showered this morning. By lunch you catch yourself again.'],
  [<IconRough />, 'Rough, bumpy skin', 'Arms, shoulders, thighs. Years of dead skin nobody taught you to remove.'],
  [<IconBack />, 'A back you can\'t reach', 'Breakouts and buildup exactly where your hands never get to.'],
  [<IconScalp />, 'An itchy, flaky scalp', 'Washed with shampoo every day, never actually cleaned.'],
  [<IconGym />, 'Never clean after the gym', 'The sweat rinses off. What causes the smell does not.'],
  [<IconDrop />, 'Tight and dry, then greasy', 'Your skin never settles. It just swings from one to the other.'],
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
            {SYMPTOMS.map(([icon, title, body]) => (
              <div key={title} className="problem-card">
                {icon}
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
          <div className="problem-fix reveal">
            <p>None of this is poor hygiene. A shower only wets the surface. Dead skin builds up for years and bacteria feed on it. <strong>SOLUM is the 10-minute system that clears it, head to toe.</strong></p>
          </div>
        </div>
      </section>
    </>
  );
}
