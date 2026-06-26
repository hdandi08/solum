const CSS = `
.cred-strip{background:var(--black);border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:40px 24px;}
.cred-strip-inner{max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:0;}
.cred-item{display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;padding:0 12px;border-right:1px solid var(--lineb);}
.cred-item:last-child{border-right:none;}
.cred-flag{font-size:22px;line-height:1;}
.cred-country{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--bone);font-weight:600;text-align:center;white-space:nowrap;}
.cred-tradition{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--stone);font-weight:400;text-align:center;white-space:nowrap;}

@media(max-width:600px){
  .cred-strip{padding:28px 16px;}
  .cred-strip-inner{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--lineb);}
  .cred-item{flex:unset;border-right:none;padding:18px 8px;background:var(--black);}
  .cred-flag{font-size:18px;}
  .cred-country{font-size:9px;letter-spacing:1.5px;white-space:normal;word-break:break-word;}
  .cred-tradition{display:none;}
}
`;

const ORIGINS = [
  { flag: '🇬🇧', country: 'United Kingdom',    tradition: 'Formulated & Made' },
  { flag: '🇰🇷', country: 'Korea',              tradition: 'Bathhouse Tradition' },
  { flag: '🇲🇦', country: 'Morocco',            tradition: 'Hammam Ritual' },
  { flag: '🇹🇷', country: 'Turkey',             tradition: 'Artisan Hamam' },
  { flag: '✓',   country: 'Sulphate-Free',      tradition: 'pH Balanced' },
  { flag: '✓',   country: 'Skin Barrier Safe',  tradition: 'Amino Acid Formula' },
];

export default function CredibilityStrip() {
  return (
    <>
      <style>{CSS}</style>
      <div className="cred-strip" data-track="credibility">
        <div className="cred-strip-inner reveal">
          {ORIGINS.map(o => (
            <div key={o.country} className="cred-item">
              <span className="cred-flag">{o.flag}</span>
              <span className="cred-country">{o.country}</span>
              <span className="cred-tradition">{o.tradition}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
