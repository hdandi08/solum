const CSS = `
.loyalty-section{background:var(--black);border-top:1px solid var(--line);padding:100px 48px;}
.loyalty-inner{max-width:1400px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center;}
.loyalty-text{display:flex;flex-direction:column;}
.loy-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blue);font-weight:600;margin-bottom:20px;}
.loy-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(48px,5vw,80px);letter-spacing:.04em;color:var(--bone);line-height:1;margin-bottom:16px;}
.loy-title em{font-style:normal;color:var(--blit);}
.loy-rule{font-size:15px;font-weight:600;letter-spacing:1px;color:var(--stone);text-transform:uppercase;border-left:2px solid var(--blue);padding-left:16px;margin-bottom:32px;line-height:1.6;}
.loy-body{font-size:17px;font-weight:300;color:var(--mist);line-height:1.75;max-width:460px;margin-bottom:40px;}
.loy-timeline{display:flex;flex-direction:column;gap:0;}
.loy-step{display:grid;grid-template-columns:96px 1fr;gap:16px;padding:20px 0;border-top:1px solid var(--line);}
.loy-step:last-child{border-bottom:1px solid var(--line);}
.loy-step-marker{font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--blit);letter-spacing:.04em;line-height:1.2;}
.loy-step-body{font-size:15px;font-weight:300;color:var(--mist);line-height:1.6;}
.loy-step-body strong{color:var(--bone);font-weight:600;display:block;margin-bottom:4px;}
.loyalty-image{position:relative;}
.loyalty-img{width:100%;display:block;filter:brightness(0.92);}
.loyalty-img-label{position:absolute;bottom:20px;left:20px;font-size:11px;letter-spacing:5px;text-transform:uppercase;color:rgba(240,236,226,0.7);font-weight:600;background:rgba(8,9,11,0.75);padding:8px 14px;backdrop-filter:blur(8px);}
.reveal{opacity:0;transform:translateY(32px);transition:opacity .7s ease,transform .7s ease;}
.reveal.visible{opacity:1;transform:translateY(0);}
.reveal-left{opacity:0;transform:translateX(-28px);transition:opacity .7s ease,transform .7s ease;}
.reveal-left.visible{opacity:1;transform:translateX(0);}
@media(max-width:768px){
  .loyalty-inner{grid-template-columns:1fr;gap:48px;}
  .loyalty-section{padding:60px 24px;}
  .loyalty-image{order:-1;}
}
`;

export default function LoyaltySection() {
  return (
    <>
      <style>{CSS}</style>
      <section className="loyalty-section" id="loyalty">
        <div className="loyalty-inner">
          <div className="loyalty-text reveal-left">
            <div className="loy-tag">The 180 Club</div>
            <h2 className="loy-title">You Can't<br />Buy <em>This.</em></h2>
            <div className="loy-rule">Not for sale. Not in the shop. Only earned.</div>
            <p className="loy-body">
              Six months of continuous subscription. That's the only qualification.
              No points. No codes. No tiers to unlock. Stay consistent — do the ritual —
              and at month six it ships with your box.
            </p>
            <div className="loy-timeline">
              <div className="loy-step">
                <div className="loy-step-marker">Day 1</div>
                <div className="loy-step-body">
                  <strong>Start your subscription</strong>
                  The clock starts with your first box.
                </div>
              </div>
              <div className="loy-step">
                <div className="loy-step-marker">Month 3</div>
                <div className="loy-step-body">
                  <strong>We ask for your size</strong>
                  One email. One question. Nothing else required.
                </div>
              </div>
              <div className="loy-step">
                <div className="loy-step-marker">Month 6</div>
                <div className="loy-step-body">
                  <strong>It ships with your box</strong>
                  The SOLUM 180 tee. Beyond clean. Yours.
                </div>
              </div>
            </div>
          </div>
          <div className="loyalty-image reveal">
            <img
              src="/solum-tshirt.jpeg"
              alt="SOLUM 180 t-shirt — Beyond Clean. Form an Orderly Queue."
              className="loyalty-img"
            />
            <div className="loyalty-img-label">The SOLUM 180 Tee — Earned, Not Bought</div>
          </div>
        </div>
      </section>
    </>
  );
}
