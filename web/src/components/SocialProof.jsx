const CSS = `
.proof-section{background:var(--char);border-top:1px solid var(--line);padding:80px 48px;}
.proof-inner{max-width:1400px;margin:0 auto;}
.proof-header{margin-bottom:64px;}
.proof-header .pr-sec-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blue);font-weight:600;margin-bottom:16px;}
.proof-header h2{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,4vw,64px);letter-spacing:.06em;color:var(--bone);line-height:1.05;}
.proof-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:var(--line);}
.proof-card{background:var(--black);padding:40px 32px;display:flex;flex-direction:column;gap:16px;}
.proof-stars{color:var(--blue);font-size:16px;letter-spacing:2px;}
.proof-quote{font-size:16px;font-weight:300;color:var(--mist);line-height:1.7;font-style:italic;}
.proof-author{display:flex;flex-direction:column;gap:3px;margin-top:auto;padding-top:16px;border-top:1px solid var(--line);}
.proof-name{font-size:13px;letter-spacing:2px;text-transform:uppercase;color:var(--bone);font-weight:600;}
.proof-info{font-size:13px;color:var(--stone);letter-spacing:1px;}
.reveal{opacity:0;transform:translateY(32px);transition:opacity .7s ease,transform .7s ease;}
.reveal.visible{opacity:1;transform:translateY(0);}
@media(max-width:768px){.proof-grid{grid-template-columns:1fr;}.proof-section{padding:60px 24px;}}
`;

const REVIEWS = [
  {
    quote: "Week one. Back. I'd never properly cleaned it once in my life. The difference after one session was embarrassing.",
    name: 'James T.',
    info: 'RITUAL subscriber · Month 4',
  },
  {
    quote: "I used to think body lotion was for women. Turns out I was just not doing basic maintenance. The 3-minute rule changed everything.",
    name: 'Marcus R.',
    info: 'GROUND subscriber · Month 2',
  },
  {
    quote: "The ritual card is brilliant. It tells you exactly what to do and for how long. There's nothing to figure out.",
    name: 'Daniel K.',
    info: 'RITUAL subscriber · Month 6',
  },
];

export default function SocialProof() {
  return (
    <>
      <style>{CSS}</style>
      <section className="proof-section" id="proof">
        <div className="proof-inner">
          <div className="proof-header reveal">
            <div className="pr-sec-tag">Here's What Actually Happens When You Do It Right</div>
            <h2>The Results<br />Speak Plainly.</h2>
          </div>
          <div className="proof-grid reveal">
            {REVIEWS.map(r => (
              <div key={r.name} className="proof-card">
                <div className="proof-stars">★★★★★</div>
                <p className="proof-quote">"{r.quote}"</p>
                <div className="proof-author">
                  <div className="proof-name">{r.name}</div>
                  <div className="proof-info">{r.info}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
