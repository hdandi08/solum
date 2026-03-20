const CSS = `
.truth-section{background:var(--char);border-top:1px solid var(--line);padding:100px 48px;}
.truth-inner{max-width:1400px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:start;}
.truth-stats-wrap{display:flex;flex-direction:column;gap:0;}
.truth-stats-intro{font-size:15px;font-weight:600;letter-spacing:0.5px;color:rgba(240,236,226,0.75);margin-bottom:16px;}
.truth-stats{display:flex;flex-direction:column;gap:1px;background:var(--line);}
.truth-stat{background:var(--black);padding:28px 32px;display:grid;grid-template-columns:96px 1fr;gap:20px;align-items:center;transition:background .25s;}
.truth-stat:hover{background:var(--mid);}
.ts-num{font-family:'Bebas Neue',sans-serif;font-size:38px;color:var(--blit);line-height:1;letter-spacing:0.02em;}
.ts-body{font-size:15px;color:var(--mist);font-weight:300;line-height:1.6;}
.ts-body strong{color:var(--bone);font-weight:600;}
.t-sec-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blue);font-weight:600;margin-bottom:16px;}
.truth-quote{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,4vw,64px);letter-spacing:0.04em;color:var(--bone);line-height:1.05;margin-bottom:32px;}
.truth-quote em{font-style:normal;color:var(--blue);}
.truth-body{font-size:17px;font-weight:300;color:var(--mist);line-height:1.75;max-width:480px;margin-bottom:32px;}
.truth-note{font-size:14px;letter-spacing:2px;text-transform:uppercase;color:var(--stone);border-left:2px solid var(--blue);padding-left:16px;line-height:1.7;}
@media(max-width:768px){.truth-inner{grid-template-columns:1fr;gap:48px;}.truth-section{padding:60px 24px;}.truth-stat{grid-template-columns:84px 1fr;}}
`;

const STATS = [
  ['Week 1', "Dead skin you didn't know existed rolls off.", 'Rinsing never removes it. Friction does. Most men are carrying years of buildup.'],
  ['Week 2', 'Body odour reduces.', 'Not from sweat — dead cells feed odour bacteria. Remove the cells, cut the source.'],
  ['Week 3', 'Skin holds moisture past midday.', "No tightness by afternoon. The 3-minute lotion window actually works when skin is clean underneath."],
  ['Day 66', "The ritual is automatic. You don't think about it.", "That's how long it takes for a habit to form. SOLUM is built around this number."],
];

export default function TruthSection() {
  return (
    <>
      <style>{CSS}</style>
      <section className="truth-section" id="truth">
        <div className="truth-inner">
          <div className="truth-text reveal-left">
            <div className="t-sec-tag">The Reality</div>
            <div className="truth-quote">Nobody<br />Taught<br />You <em>This.</em></div>
            <p className="truth-body">
              You were taught to shower. You weren't taught what to do in there.
              Most men use one product on their entire body and consider it done.
              The result: years of dead skin buildup, persistent dryness, back breakouts
              nobody talks about, and body odour that worsens because of accumulated dead
              cells — not just sweat.
              <br /><br />
              This isn't a grooming luxury. It's basic maintenance that was never explained.
              SOLUM is the system that should have existed twenty years ago.
            </p>
            <div className="truth-note">
              SOLUM is body care only. It does not replace your face routine, shampoo,
              or deodorant. It addresses everything else — the 90% of your skin most
              products ignore entirely.
            </div>
          </div>
          <div className="truth-stats-wrap reveal">
            <div className="truth-stats-intro">Here's what actually happens when you do it right:</div>
            <div className="truth-stats">
              {STATS.map(([num, bold, rest]) => (
                <div key={num} className="truth-stat">
                  <div className="ts-num">{num}</div>
                  <div className="ts-body"><strong>{bold}</strong> {rest}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
