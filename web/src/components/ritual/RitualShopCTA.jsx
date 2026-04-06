const CSS = `
.rp-cta{background:var(--char);border-top:1px solid var(--lineb);padding:56px 48px;}
.rp-cta-inner{max-width:1400px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:32px;flex-wrap:wrap;}
.rp-cta-title{font-family:'Bebas Neue',sans-serif;font-size:36px;letter-spacing:.06em;color:var(--bone);margin-bottom:8px;}
.rp-cta-sub{font-size:14px;color:var(--stone);font-weight:300;}
.rp-cta-btn{font-size:11px;letter-spacing:4px;text-transform:uppercase;background:var(--bone);color:var(--black);padding:16px 36px;text-decoration:none;white-space:nowrap;transition:background .2s;}
.rp-cta-btn:hover{background:#fff;}
@media(max-width:768px){.rp-cta{padding:40px 24px;}.rp-cta-inner{flex-direction:column;align-items:flex-start;}}
`;

export default function RitualShopCTA() {
  return (
    <>
      <style>{CSS}</style>
      <div className="rp-cta">
        <div className="rp-cta-inner">
          <div>
            <div className="rp-cta-title">Ready to start?</div>
            <div className="rp-cta-sub">Everything you need is in one kit. Ships together.</div>
          </div>
          <a href="/#kits" className="rp-cta-btn">Choose Your Kit</a>
        </div>
      </div>
    </>
  );
}
