// Full-bleed editorial punctuation — a face-forward image with a short brand line,
// used to break up text sections on the homepage.
const CSS = `
.fbb{position:relative;width:100%;height:78vh;min-height:460px;max-height:820px;overflow:hidden;background:#000;border-top:1px solid var(--line);}
.fbb-img{width:100%;height:100%;object-fit:cover;object-position:center 22%;display:block;}
.fbb-scrim{position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,9,11,0.82) 0%,rgba(8,9,11,0.4) 42%,rgba(8,9,11,0) 72%);}
.fbb-inner{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;width:100%;max-width:1400px;margin:0 auto;padding:0 48px;}
.fbb-eyebrow{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:16px;}
.fbb-head{font-family:'Bebas Neue',sans-serif;font-size:clamp(44px,7vw,92px);letter-spacing:.03em;color:var(--bone);line-height:.9;max-width:640px;margin:0;}
.fbb-sub{font-size:16px;font-weight:300;color:var(--mist);max-width:420px;margin-top:18px;line-height:1.6;}
@media(max-width:768px){
  .fbb{height:72vh;}
  .fbb-inner{padding:0 24px;justify-content:flex-end;padding-bottom:48px;}
  .fbb-scrim{background:linear-gradient(0deg,rgba(8,9,11,0.9) 0%,rgba(8,9,11,0.15) 55%,rgba(8,9,11,0.35) 100%);}
}
`;

export default function FullBleedBand({ image, eyebrow, head, sub }) {
  return (
    <>
      <style>{CSS}</style>
      <section className="fbb" data-track="band">
        <img className="fbb-img" src={image} alt="" loading="lazy" />
        <div className="fbb-scrim" />
        <div className="fbb-inner">
          {eyebrow && <div className="fbb-eyebrow">{eyebrow}</div>}
          <h2 className="fbb-head">{head}</h2>
          {sub && <p className="fbb-sub">{sub}</p>}
        </div>
      </section>
    </>
  );
}
