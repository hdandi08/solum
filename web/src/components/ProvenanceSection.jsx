const CSS = `
.origins{background:var(--black);border-top:1px solid var(--line);padding:80px 48px;}
.origins-inner{max-width:1400px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:start;}
.origins-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:var(--line);}
.origin-tile{background:var(--char);padding:28px 22px;display:flex;flex-direction:column;gap:8px;transition:background .25s;position:relative;overflow:hidden;}
.origin-tile::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:var(--blue);transform:scaleX(0);transform-origin:left;transition:transform .3s ease;}
.origin-tile:hover{background:var(--mid);}
.origin-tile:hover::after{transform:scaleX(1);}
.origin-flag{font-size:20px;margin-bottom:2px;}
.origin-country{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--blit);font-weight:600;}
.origin-product{font-size:13px;letter-spacing:1px;text-transform:uppercase;color:var(--bone);font-weight:600;line-height:1.3;}
.origin-why{font-size:14px;color:var(--stone);line-height:1.5;font-weight:300;margin-top:4px;}
.o-sec-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:16px;}
.o-sec-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,4vw,64px);letter-spacing:.06em;color:var(--bone);line-height:1.05;margin-bottom:24px;}
.o-sec-body{font-size:16px;color:var(--mist);font-weight:300;line-height:1.7;max-width:480px;}
@media(max-width:768px){.origins-inner{grid-template-columns:1fr;gap:40px;}.origins-grid{grid-template-columns:1fr;}.origins{padding:60px 24px;}}
`;

const ORIGINS = [
  {
    flag: '🇬🇧',
    country: 'United Kingdom',
    product: 'Body Wash · Body Lotion',
    why: 'Skin feels calm after washing and comfortable after towelling. Gentle clean, lasting hydration, no stripped feeling.',
  },
  {
    flag: '🇰🇷',
    country: 'Korean Tradition',
    product: 'Italy Towel · Back Scrub · Scalp Massager',
    why: 'Smoother skin, less odour and a back that finally gets reached. Built for the parts hands miss.',
  },
  {
    flag: '🇲🇦',
    country: 'Morocco',
    product: 'Atlas Clay · Argan Body Oil',
    why: 'Clearer skin after the clay reset, then a fed barrier feel after the oil finish.',
  },
];

export default function ProvenanceSection() {
  return (
    <>
      <style>{CSS}</style>
      <section className="origins" id="origins">
        <div className="origins-inner">
          <div className="reveal-left">
            <div className="o-sec-tag">Chosen For The Result</div>
            <h2 className="o-sec-title">Sourced From<br />Where It Works.</h2>
            <p className="o-sec-body">
              Origins matter only when they change what you feel after the shower.
              These choices are here for smoother skin, lasting comfort and a better reset.
            </p>
          </div>
          <div className="origins-grid reveal">
            {ORIGINS.map(o => (
              <div key={o.country} className="origin-tile">
                <div className="origin-flag">{o.flag}</div>
                <div className="origin-country">{o.country}</div>
                <div className="origin-product">{o.product}</div>
                <div className="origin-why">{o.why}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
