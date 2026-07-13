import { useEffect, useRef, useState } from 'react';
import { KITS } from '../data/kits.js';
import { capture } from '../lib/analytics.js';

const CSS = `
.sticky-kitbar{
  position:fixed;bottom:0;left:0;right:0;z-index:180;
  display:none;align-items:center;justify-content:space-between;gap:12px;
  height:56px;padding:0 14px;padding-bottom:env(safe-area-inset-bottom, 0px);
  box-sizing:content-box;background:#08090B;
  border-top:1px solid rgba(46,109,164,0.55);
}
.sticky-kitbar-prices{
  font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:600;
  letter-spacing:1.2px;text-transform:uppercase;color:var(--mist);white-space:nowrap;
}
.sticky-kitbar-cta{
  font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:.12em;
  background:var(--bone);color:var(--black);border:none;
  padding:13px 22px;cursor:pointer;white-space:nowrap;
}
/* Lift the founder chat launcher above the bar while it is shown */
body.has-kitbar .fc-launcher{bottom:calc(80px + env(safe-area-inset-bottom, 0px));}
body.has-kitbar .fc-bubble{bottom:calc(142px + env(safe-area-inset-bottom, 0px));}
@media(max-width:768px){.sticky-kitbar{display:flex;}}
`;

// Mobile-only persistent path to purchase: appears once the visitor scrolls past
// the hero and stays until the kit cards are actually on screen — the one moment
// it would only duplicate what is already visible.
export default function StickyKitBar() {
  const [pastHero, setPastHero] = useState(false);
  const [kitsInView, setKitsInView] = useState(false);
  const shownOnce = useRef(false);

  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 0.9);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const el = document.getElementById('kits');
    if (!el) return undefined;
    const obs = new IntersectionObserver(
      (entries) => setKitsInView(entries.some(e => e.isIntersecting)),
      { threshold: 0.05 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const show = pastHero && !kitsInView;

  useEffect(() => {
    document.body.classList.toggle('has-kitbar', show);
    if (show && !shownOnce.current) {
      shownOnce.current = true;
      capture('sticky_bar_shown');
    }
    return () => document.body.classList.remove('has-kitbar');
  }, [show]);

  if (!show) return null;

  const prices = KITS
    .filter(k => !k.comingSoon && !k.hidden)
    .map(k => `${k.name} £${k.firstBoxPrice}`)
    .join(' · ');

  const goToKits = () => {
    capture('sticky_bar_cta_clicked');
    document.getElementById('kits')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="sticky-kitbar">
        <span className="sticky-kitbar-prices">{prices}</span>
        <button type="button" className="sticky-kitbar-cta" onClick={goToKits}>
          Get Your Kit &#8594;
        </button>
      </div>
    </>
  );
}
