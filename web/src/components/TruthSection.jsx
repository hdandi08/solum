const CSS = `
.truth-section{background:var(--char);border-top:1px solid var(--line);padding:100px 48px;}
.truth-inner{max-width:1400px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:start;}
.truth-stats{display:flex;flex-direction:column;gap:1px;background:var(--line);}
.truth-stat{background:var(--black);padding:32px 36px;display:grid;grid-template-columns:80px 1fr;gap:24px;align-items:center;transition:background .25s;}
.truth-stat:hover{background:var(--mid);}
.ts-num{font-family:'Bebas Neue',sans-serif;font-size:56px;color:var(--blue);line-height:1;letter-spacing:-1px;}
.ts-body{font-size:15px;color:var(--mist);font-weight:300;line-height:1.6;}
.ts-body strong{color:var(--bone);font-weight:600;}
.t-sec-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blue);font-weight:600;margin-bottom:16px;}
.truth-quote{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,4vw,64px);letter-spacing:0.04em;color:var(--bone);line-height:1.05;margin-bottom:32px;}
.truth-quote em{font-style:normal;color:var(--blue);}
.truth-body{font-size:17px;font-weight:300;color:var(--mist);line-height:1.75;max-width:480px;margin-bottom:32px;}
.truth-note{font-size:14px;letter-spacing:2px;text-transform:uppercase;color:var(--stone);border-left:2px solid var(--blue);padding-left:16px;line-height:1.7;}
.reveal{opacity:0;transform:translateY(32px);transition:opacity .7s ease,transform .7s ease;}
.reveal.visible{opacity:1;transform:translateY(0);}
.reveal-left{opacity:0;transform:translateX(-28px);transition:opacity .7s ease,transform .7s ease;}
.reveal-left.visible{opacity:1;transform:translateX(0);}
@media(max-width:768px){.truth-inner{grid-template-columns:1fr;gap:48px;}.truth-section{padding:60px 24px;}}
`;

const STATS = [
  ['58%', 'of UK men use zero body care products.', "Not because they don't care — because nothing was built for them."],
  ['0', 'Times the average man has cleaned his back properly.', 'The back scrub cloth exists because this area is almost universally neglected.'],
  ['3', 'Minute window after showering', 'when your skin absorbs moisture most efficiently. Most men miss it every single day.'],
  ['66', 'Days for a habit to become automatic.', 'SOLUM is designed around this number. The system is built to get you there.'],
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
          <div className="truth-stats reveal">
            {STATS.map(([num, bold, rest]) => (
              <div key={num} className="truth-stat">
                <div className="ts-num">{num}</div>
                <div className="ts-body"><strong>{bold}</strong> {rest}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
