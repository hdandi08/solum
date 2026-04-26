const CSS = `
.proof-section{background:var(--char);border-top:1px solid var(--line);padding:80px 48px;}
.proof-inner{max-width:1400px;margin:0 auto;}
.proof-header{margin-bottom:64px;}
.proof-header .pr-sec-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:16px;}
.proof-header h2{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,4vw,64px);letter-spacing:.06em;color:var(--bone);line-height:1.05;}
.proof-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:var(--line);}
.proof-card{background:var(--black);padding:40px 32px;display:flex;flex-direction:column;gap:0;}
.proof-week{font-size:11px;letter-spacing:5px;text-transform:uppercase;color:var(--blit);font-weight:700;margin-bottom:16px;}
.proof-outcome{font-family:'Bebas Neue',sans-serif;font-size:clamp(28px,2.5vw,40px);letter-spacing:.04em;color:var(--bone);line-height:1.05;margin-bottom:20px;}
.proof-detail{font-size:15px;font-weight:300;color:var(--mist);line-height:1.75;flex:1;}
.proof-zone{display:inline-flex;align-items:center;gap:8px;margin-top:24px;padding-top:20px;border-top:1px solid var(--line);}
.proof-zone-dot{width:6px;height:6px;border-radius:50%;background:var(--blue);flex-shrink:0;}
.proof-zone-label{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);font-weight:600;}
@media(max-width:768px){.proof-grid{grid-template-columns:1fr;}.proof-section{padding:60px 24px;}}
`;

const OUTCOMES = [
  {
    week: 'Session One',
    outcome: 'Your Back. For The First Time.',
    detail: 'The back scrub cloth reaches what no shower ever has. In 60 seconds. The difference is immediate — you will feel skin that has never been touched by a proper clean.',
    zone: 'Back · Dead Skin',
  },
  {
    week: 'Week Two',
    outcome: 'Skin That Holds Moisture Past Midday.',
    detail: 'The 3-minute lotion window is real. Once you start applying it warm and on cleared skin, you stop needing to reapply. Your skin stops losing moisture through the day.',
    zone: 'Full Body · Hydration',
  },
  {
    week: 'Month Two',
    outcome: 'It Stops Feeling Like Effort.',
    detail: 'Ten minutes. Muscle memory. You stop thinking about each step and start noticing when you skip it. That is the point at which the ritual is yours.',
    zone: 'Scalp · Skin · Habit',
  },
];

export default function SocialProof() {
  return (
    <>
      <style>{CSS}</style>
      <section className="proof-section" id="proof">
        <div className="proof-inner">
          <div className="proof-header reveal">
            <div className="pr-sec-tag">What To Expect When You Do It Right</div>
            <h2>The Results<br />Speak Plainly.</h2>
          </div>
          <div className="proof-grid reveal">
            {OUTCOMES.map(o => (
              <div key={o.week} className="proof-card">
                <div className="proof-week">{o.week}</div>
                <div className="proof-outcome">{o.outcome}</div>
                <p className="proof-detail">{o.detail}</p>
                <div className="proof-zone">
                  <span className="proof-zone-dot" />
                  <span className="proof-zone-label">{o.zone}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
