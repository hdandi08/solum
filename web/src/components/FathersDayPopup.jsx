import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Order deadline: Wed 18 June midday BST (matches the ad creative)
const DEADLINE = new Date('2026-06-18T12:00:00+01:00');
const SESSION_KEY = 'fd_popup_dismissed';

function isPaidAdTraffic() {
  const params = new URLSearchParams(window.location.search);
  return params.has('fbclid') || params.has('ttclid');
}

function isActive() {
  return Date.now() < DEADLINE.getTime();
}

const CSS = `
.fd-popup-overlay{
  position:fixed;inset:0;z-index:9999;
  background:rgba(0,0,0,0.92);
  overflow-y:auto;
  display:flex;align-items:flex-start;justify-content:center;
  padding:0 0 40px;
  animation:fd-fade-in .25s ease;
}
@keyframes fd-fade-in{from{opacity:0;}to{opacity:1;}}

.fd-popup-card{
  background:#08090B;
  border:1px solid #1e2530;
  max-width:420px;
  width:100%;
}

.fd-popup-img{
  display:block;width:100%;
  aspect-ratio:4/5;
  object-fit:cover;object-position:center center;
}

.fd-popup-body{
  padding:16px 24px 0;
}

.fd-popup-eyebrow{
  font-size:10px;letter-spacing:4px;text-transform:uppercase;
  color:#4A8FC7;font-weight:700;
  margin-bottom:8px;
  display:flex;align-items:center;gap:10px;
}
.fd-popup-eyebrow::before{
  content:'';width:16px;height:1px;background:#2E6DA4;flex-shrink:0;
}

.fd-popup-headline{
  font-family:'Bebas Neue',sans-serif;
  font-size:32px;letter-spacing:.04em;
  color:#F0ECE2;line-height:1;
  margin-bottom:6px;
}

.fd-popup-deadline{
  font-size:12px;color:rgba(240,236,226,0.45);
  font-weight:300;margin-bottom:18px;line-height:1.5;
}
.fd-popup-deadline strong{color:#F0ECE2;font-weight:600;}

.fd-popup-cta{
  font-family:'Bebas Neue',sans-serif;
  font-size:15px;letter-spacing:.12em;
  background:#F0ECE2;color:#08090B;
  border:none;padding:16px;
  cursor:pointer;width:100%;
  text-align:center;
  transition:background .2s,transform .15s;
}
.fd-popup-cta:hover{background:#fff;transform:translateY(-1px);}

.fd-popup-dismiss{
  display:block;width:100%;
  margin-top:12px;padding:14px;
  background:none;
  border:none;
  border-top:1px solid rgba(240,236,226,0.08);
  font-size:12px;letter-spacing:2px;text-transform:uppercase;
  color:rgba(240,236,226,0.65);
  cursor:pointer;text-align:center;
  transition:color .2s;
}
.fd-popup-dismiss:hover{color:#F0ECE2;}
`;

export default function FathersDayPopup() {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isActive()) return;
    if (!isPaidAdTraffic()) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const t = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    sessionStorage.setItem(SESSION_KEY, '1');
    setVisible(false);
  }

  function go(kit) {
    sessionStorage.setItem(SESSION_KEY, '1');
    navigate(`/buy?kit=${kit}&source=fd_gift`);
  }

  if (!visible) return null;

  return (
    <>
      <style>{CSS}</style>
      <div className="fd-popup-overlay" onClick={dismiss}>
        <div className="fd-popup-card" onClick={e => e.stopPropagation()}>
          <img
            src="/email/fd-popup-hero.jpg"
            alt="The perfect Father's Day gift — SOLUM"
            className="fd-popup-img"
          />

          <div className="fd-popup-body">
            <div className="fd-popup-deadline">
              Order by <strong>midday Wed 18 June</strong> for guaranteed delivery.
            </div>

            <button className="fd-popup-cta" onClick={() => go('ritual')}>
              Gift RITUAL Kit — £85
            </button>
          </div>

          <button className="fd-popup-dismiss" onClick={dismiss}>
            Explore SOLUM →
          </button>
        </div>
      </div>
    </>
  );
}
