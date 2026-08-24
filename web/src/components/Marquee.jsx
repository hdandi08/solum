const CSS = `
.marquee-wrap{overflow:hidden;border-top:1px solid rgba(240,236,226,.08);border-bottom:1px solid rgba(240,236,226,.08);background:#090b0f;padding:12px 0;}
.marquee-track{display:flex;gap:0;white-space:nowrap;animation:marquee 42s linear infinite;}
@keyframes marquee{from{transform:translateX(0);}to{transform:translateX(-50%);}}
.marquee-item{font-family:'Bebas Neue',sans-serif;font-size:13px;letter-spacing:0.22em;color:rgba(240,236,226,.52);padding:0 42px;display:flex;align-items:center;gap:42px;}
.marquee-dot{width:3px;height:3px;border-radius:50%;background:rgba(74,143,199,.68);flex-shrink:0;display:inline-block;}
`;

const ITEMS = [
  'GROUND · RITUAL',
  'COMPLETE SYSTEM. ONE RITUAL.',
  'PRESS-RECOGNISED',
  'BODY CARE. NOT FACE, NOT HAIR.',
  'FIRST BATCH · 250 KITS.',
];

const ALL = [...ITEMS, ...ITEMS];

export default function Marquee() {
  return (
    <>
      <style>{CSS}</style>
      <div className="marquee-wrap">
        <div className="marquee-track">
          {ALL.map((item, i) => (
            <span key={i} className="marquee-item">
              {item}<span className="marquee-dot" />
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
