const CSS = `
.rp-hero{padding:72px 48px 56px;border-bottom:1px solid var(--line);max-width:1400px;margin:0 auto;}
.rp-eyebrow{font-size:11px;letter-spacing:6px;text-transform:uppercase;font-weight:600;color:var(--blit);margin-bottom:14px;}
.rp-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(52px,6vw,88px);letter-spacing:.05em;color:var(--bone);line-height:1;margin-bottom:16px;}
.rp-subtitle{font-size:16px;color:var(--stone);font-weight:300;max-width:520px;line-height:1.6;}
@media(max-width:768px){.rp-hero{padding:48px 24px 40px;}}
`;

export default function RitualPageHero() {
  return (
    <>
      <style>{CSS}</style>
      <div className="rp-hero">
        <div className="rp-eyebrow">The Ritual System</div>
        <div className="rp-title">How To Use SOLUM</div>
        <p className="rp-subtitle">Two rituals. One daily, one weekly. Everything you need to know to do them properly.</p>
      </div>
    </>
  );
}
