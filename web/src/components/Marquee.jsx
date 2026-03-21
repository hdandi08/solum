const CSS = `
.marquee-wrap{overflow:hidden;border-top:1px solid var(--lineb);border-bottom:1px solid var(--lineb);background:var(--char);padding:14px 0;}
.marquee-track{display:flex;gap:0;white-space:nowrap;animation:marquee 28s linear infinite;}
@keyframes marquee{from{transform:translateX(0);}to{transform:translateX(-50%);}}
.marquee-item{font-family:'Bebas Neue',sans-serif;font-size:15px;letter-spacing:0.18em;color:var(--stone);padding:0 36px;display:flex;align-items:center;gap:36px;}
.marquee-dot{width:4px;height:4px;border-radius:50%;background:var(--blue);flex-shrink:0;display:inline-block;}
`;

const ITEMS = [
  'The Ritual Men Were Never Taught',
  'Ground · Ritual · Sovereign',
  '10 Minutes Daily · 18 Minutes Weekly',
  '10 Products · One System',
  'Body Care — Not Face. Not Hair.',
  'Monthly. Automatic. Never Run Out.',
  'UK · Korea · Morocco',
  'Formulated for Men. Built to Last.',
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
