import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PRODUCTS } from '../data/products';
import { capture } from '../lib/analytics';
import WaitlistForm from '../components/WaitlistForm';
import FoundingBar from '../components/FoundingBar';

const styles = `
  .ac-wrap {
    min-height: 100vh;
    background: #08090b;
    color: #f0ece2;
    font-family: 'Barlow Condensed', sans-serif;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }
  .ac-ghost {
    position: fixed;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(180px, 30vw, 420px);
    letter-spacing: -4px;
    color: transparent;
    -webkit-text-stroke: 1px rgba(46,109,164,0.055);
    pointer-events: none;
    user-select: none;
    white-space: nowrap;
    z-index: 0;
  }
  .ac-glow {
    position: fixed;
    top: 30%; left: 50%;
    transform: translate(-50%, -50%);
    width: 800px; height: 600px;
    background: radial-gradient(ellipse, rgba(46,109,164,0.07) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }
  .ac-topbar {
    position: fixed;
    top: 0; left: 0; right: 0;
    height: 56px;
    display: flex;
    align-items: center;
    padding: 0 28px;
    background: rgba(8,9,11,0.9);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(240,236,226,0.07);
    z-index: 100;
  }
  .ac-logo {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 22px;
    letter-spacing: 0.15em;
    color: #f0ece2;
  }
  .ac-topbar-tag {
    margin-left: auto;
    font-size: 11px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: #4a8fc7;
    font-weight: 600;
  }

  /* ── Hero ─────────────────────────────────────────────────── */
  .ac-main {
    position: relative;
    z-index: 1;
    padding: 120px 28px 60px;
    max-width: 680px;
    margin: 0 auto;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 20px;
    box-sizing: border-box;
  }
  .ac-eyebrow {
    font-size: 13px;
    letter-spacing: 5px;
    text-transform: uppercase;
    color: rgba(240,236,226,0.5);
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .ac-eyebrow::before {
    content: '';
    width: 28px; height: 1px;
    background: #2e6da4;
    flex-shrink: 0;
  }
  .ac-headline {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(44px, 8vw, 80px);
    line-height: 0.95;
    letter-spacing: 0.03em;
    color: #f0ece2;
    margin: 0;
  }
  .ac-headline em { font-style: normal; color: #4a8fc7; }
  .ac-subhead {
    font-size: 18px;
    font-weight: 300;
    color: rgba(240,236,226,0.72);
    line-height: 1.7;
    letter-spacing: 0.3px;
    margin: 0;
  }
  .ac-urgency {
    font-size: 13px;
    letter-spacing: 3px;
    text-transform: uppercase;
    font-weight: 500;
    color: #c8a96e;
    text-align: center;
  }
  .ac-privacy {
    font-size: 13px;
    color: rgba(240,236,226,0.4);
    letter-spacing: 1px;
    text-align: center;
    margin-top: 4px;
  }

  /* ── Founder quote ────────────────────────────────────────── */
  .ac-founder {
    margin-top: 8px;
    padding: 20px;
    border-top: 1px solid rgba(240,236,226,0.08);
  }
  .ac-founder-who {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }
  .ac-founder-img {
    width: 32px; height: 32px;
    border-radius: 50%;
    object-fit: cover;
    object-position: center 15%;
    filter: grayscale(30%) contrast(1.05);
    border: 1.5px solid rgba(74,143,199,0.4);
    flex-shrink: 0;
  }
  .ac-founder-label {
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    font-weight: 600;
    color: #4a8fc7;
  }
  .ac-founder-quote {
    font-size: clamp(15px, 2vw, 17px);
    font-weight: 300;
    color: rgba(240,236,226,0.78);
    line-height: 1.7;
    font-style: italic;
  }

  /* ── Outcomes ─────────────────────────────────────────────── */
  .ac-outcomes {
    position: relative; z-index: 1;
    padding: 60px 28px;
    max-width: 680px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }
  .ac-outcomes-eyebrow {
    font-size: 11px;
    letter-spacing: 5px;
    text-transform: uppercase;
    color: #4a8fc7;
    font-weight: 600;
    margin-bottom: 12px;
  }
  .ac-outcomes-heading {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(28px, 4vw, 44px);
    letter-spacing: 0.06em;
    color: #f0ece2;
    line-height: 1.05;
    margin-bottom: 36px;
  }
  .ac-outcomes-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1px;
    background: rgba(240,236,226,0.08);
  }
  .ac-outcome {
    background: #08090b;
    padding: 28px 24px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .ac-outcome-marker {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 13px;
    letter-spacing: 3px;
    color: rgba(240,236,226,0.3);
    text-transform: uppercase;
    line-height: 1.1;
  }
  .ac-outcome-marker em {
    font-style: normal;
    font-size: 40px;
    color: #2e6da4;
    display: block;
    line-height: 1;
  }
  .ac-outcome-title {
    font-size: 16px;
    font-weight: 600;
    color: #f0ece2;
    line-height: 1.4;
    letter-spacing: 0.3px;
  }
  .ac-outcome-body {
    font-size: 14px;
    font-weight: 300;
    color: rgba(240,236,226,0.6);
    line-height: 1.7;
    flex: 1;
  }
  .ac-outcome-tag {
    font-size: 10px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #4a8fc7;
    font-weight: 600;
  }

  /* ── Products ─────────────────────────────────────────────── */
  .ac-products-wrap {
    position: relative; z-index: 1;
    padding: 0 28px 60px;
    max-width: 680px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }
  .ac-products-label {
    font-size: 11px;
    letter-spacing: 5px;
    text-transform: uppercase;
    color: #4a8fc7;
    font-weight: 600;
    margin-bottom: 12px;
  }
  .ac-products-heading {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(24px, 3.5vw, 36px);
    letter-spacing: 0.06em;
    color: #f0ece2;
    line-height: 1.05;
    margin-bottom: 28px;
  }
  .ac-products-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1px;
    background: rgba(240,236,226,0.08);
  }
  .ac-prod-card {
    background: #0d1117;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .ac-prod-img-wrap {
    width: 100%;
    aspect-ratio: 1;
    background: #12151a;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .ac-prod-img-wrap img {
    width: 100%; height: 100%;
    object-fit: cover;
  }
  .ac-prod-num {
    font-size: 10px;
    letter-spacing: 3px;
    color: rgba(74,143,199,0.7);
    font-weight: 600;
  }
  .ac-prod-name {
    font-size: 14px;
    font-weight: 600;
    color: #f0ece2;
    letter-spacing: 0.5px;
  }
  .ac-prod-tagline {
    font-size: 13px;
    font-weight: 300;
    color: rgba(240,236,226,0.55);
    line-height: 1.5;
  }
  .ac-prod-freq {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: auto;
    padding-top: 4px;
  }
  .ac-freq-dot {
    width: 5px; height: 5px;
    border-radius: 50%;
  }
  .ac-freq-dot.daily  { background: #2e6da4; }
  .ac-freq-dot.weekly { background: #c8a96e; }
  .ac-freq-label {
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    font-weight: 600;
  }
  .ac-freq-label.daily  { color: #4a8fc7; }
  .ac-freq-label.weekly { color: #c8a96e; }

  /* ── Ritual teaser ─────────────────────────────────────────── */
  .ac-ritual-wrap {
    position: relative; z-index: 1;
    padding: 0 28px 60px;
    max-width: 680px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }
  .ac-ritual-header {
    margin-bottom: 20px;
  }
  .ac-ritual-eyebrow {
    font-size: 11px;
    letter-spacing: 5px;
    text-transform: uppercase;
    color: #4a8fc7;
    font-weight: 600;
    margin-bottom: 8px;
  }
  .ac-ritual-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(24px, 3.5vw, 36px);
    letter-spacing: 0.06em;
    color: #f0ece2;
    line-height: 1.05;
    margin-bottom: 8px;
  }
  .ac-ritual-sub {
    font-size: 15px;
    font-weight: 300;
    color: rgba(240,236,226,0.55);
  }
  .ac-ritual-gate {
    position: relative;
    overflow: hidden;
  }
  .ac-ritual-steps-preview {
    display: flex;
    flex-direction: column;
    gap: 1px;
    background: rgba(240,236,226,0.08);
  }
  .ac-ritual-step {
    background: #0d1117;
    padding: 14px 18px;
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .ac-step-num {
    font-size: 10px;
    letter-spacing: 3px;
    font-weight: 700;
    min-width: 20px;
  }
  .ac-step-num.daily  { color: #4a8fc7; }
  .ac-step-num.weekly { color: #c8a96e; }
  .ac-step-name {
    font-size: 14px;
    font-weight: 600;
    color: #f0ece2;
  }
  .ac-ritual-blur-overlay {
    position: absolute;
    top: 40%; left: 0; right: 0; bottom: 0;
    background: linear-gradient(transparent, rgba(8,9,11,0.97) 20%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding-top: 24px;
    gap: 10px;
  }
  .ac-gate-label {
    font-size: 11px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: rgba(240,236,226,0.55);
    font-weight: 600;
  }
  .ac-gate-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(20px, 3vw, 28px);
    letter-spacing: 0.06em;
    color: #f0ece2;
    text-align: center;
    line-height: 1.1;
    padding: 0 20px;
  }
  .ac-gate-cta {
    display: inline-block;
    background: #2e6da4;
    color: #f0ece2;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 15px;
    letter-spacing: 3px;
    padding: 13px 32px;
    border: none;
    cursor: pointer;
    transition: background 0.2s;
    text-decoration: none;
  }
  .ac-gate-cta:hover { background: #4a8fc7; }

  /* ── Subscription ──────────────────────────────────────────── */
  .ac-sub {
    position: relative; z-index: 1;
    padding: 0 28px 60px;
    max-width: 680px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
    border-top: 1px solid rgba(240,236,226,0.08);
    padding-top: 48px;
  }
  .ac-sub-tag {
    font-size: 11px;
    letter-spacing: 5px;
    text-transform: uppercase;
    color: #4a8fc7;
    font-weight: 600;
    margin-bottom: 10px;
  }
  .ac-sub-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(28px, 4vw, 44px);
    letter-spacing: 0.06em;
    color: #f0ece2;
    line-height: 1.05;
    margin-bottom: 16px;
  }
  .ac-sub-body {
    font-size: 16px;
    font-weight: 300;
    color: rgba(240,236,226,0.65);
    line-height: 1.7;
    margin-bottom: 28px;
  }
  .ac-sub-items { display: flex; flex-direction: column; gap: 1px; background: rgba(240,236,226,0.08); }
  .ac-sub-item { background: #0d1117; padding: 18px 20px; }
  .ac-sub-item-tag {
    font-size: 10px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: #4a8fc7;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .ac-sub-item-title {
    font-size: 15px;
    font-weight: 600;
    color: #f0ece2;
    margin-bottom: 4px;
  }
  .ac-sub-item-body {
    font-size: 13px;
    font-weight: 300;
    color: rgba(240,236,226,0.55);
    line-height: 1.6;
  }

  /* ── Bottom CTA ───────────────────────────────────────────── */
  .ac-cta2 {
    position: relative; z-index: 1;
    padding: 0 28px 80px;
    max-width: 680px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
    text-align: center;
  }
  .ac-cta2-headline {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(28px, 5vw, 44px);
    letter-spacing: 0.06em;
    color: #f0ece2;
    line-height: 1.05;
    margin-bottom: 8px;
  }
  .ac-cta2-sub {
    font-size: 16px;
    font-weight: 300;
    color: rgba(240,236,226,0.6);
    margin-bottom: 28px;
    line-height: 1.6;
  }

  /* ── Marquee ──────────────────────────────────────────────── */
  .ac-marquee-wrap {
    position: relative; z-index: 1;
    overflow: hidden;
    border-top: 1px solid rgba(240,236,226,0.07);
    border-bottom: 1px solid rgba(240,236,226,0.07);
    padding: 14px 0;
  }
  .ac-marquee-track {
    display: flex;
    gap: 0;
    animation: acMarquee 30s linear infinite;
    white-space: nowrap;
  }
  @keyframes acMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
  .ac-marquee-item {
    font-size: 11px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: rgba(240,236,226,0.35);
    font-weight: 600;
    padding: 0 24px;
    flex-shrink: 0;
  }
  .ac-marquee-dot { margin-left: 24px; color: #2e6da4; }

  /* ── Footer ───────────────────────────────────────────────── */
  .ac-footer {
    position: relative; z-index: 1;
    padding: 28px;
    text-align: center;
    border-top: 1px solid rgba(240,236,226,0.07);
  }
  .ac-footer-logo {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 18px;
    letter-spacing: 0.15em;
    color: rgba(240,236,226,0.3);
    margin-bottom: 8px;
  }
  .ac-footer-links {
    display: flex;
    gap: 20px;
    justify-content: center;
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .ac-footer-links a { color: rgba(240,236,226,0.3); text-decoration: none; }
  .ac-footer-links a:hover { color: rgba(240,236,226,0.6); }

  @media (max-width: 600px) {
    .ac-outcomes-grid { grid-template-columns: 1fr; }
    .ac-products-grid { grid-template-columns: 1fr; }
    .ac-main { padding: 100px 20px 48px; }
    .ac-outcomes, .ac-products-wrap, .ac-ritual-wrap, .ac-sub, .ac-cta2 { padding-left: 20px; padding-right: 20px; }
  }
`;

const MARQUEE_ITEMS = [
  'Sulphate-Free', 'pH Balanced', 'Korean Bathhouse Tradition',
  'Moroccan Atlas Clay', 'Cold-Pressed Argan Oil', 'Silicone Scalp Massager',
  'Ships to UK', 'Cancel Any Time', 'Skin Barrier Safe',
  'Sulphate-Free', 'pH Balanced', 'Korean Bathhouse Tradition',
  'Moroccan Atlas Clay', 'Cold-Pressed Argan Oil', 'Silicone Scalp Massager',
  'Ships to UK', 'Cancel Any Time', 'Skin Barrier Safe',
];

const OUTCOMES = [
  {
    period: 'Week', num: '1',
    title: 'Dead skin rolls off. Post-training itch clears up.',
    body: "You'll see it on the mitt. Build-up from daily sessions that rinsing alone never reached. The scalp massager clears what sweat leaves behind every time.",
    tag: 'Visible · Session 1',
  },
  {
    period: 'Week', num: '2',
    title: 'Post-training odour drops. Significantly.',
    body: 'Dead cells feed odour bacteria — not sweat. Clear them after every session and the source goes. Less smell. Same sessions. Same effort.',
    tag: 'Noticeable · You & Others',
  },
  {
    period: 'Week', num: '3',
    title: 'Skin barrier strengthens. Less irritation from kit.',
    body: 'Skin that\'s properly hydrated doesn\'t dry out or crack under friction. Kit rash reduces. Recovery feels different. This is what the lotion does in the 3-minute window.',
    tag: 'All Day · Not Just Post-Shower',
  },
  {
    period: 'Day', num: '66',
    title: "Your body keeps up with your training. Habit locked.",
    body: "Two full cycles of new skin. Visible. Permanent. The routine is muscle memory now — you don't decide to do it. You'd want to take your shirt off.",
    tag: 'Others Notice · Locked In For Life',
  },
];

export default function AthleteComingSoon() {
  const [waitlistCount, setWaitlistCount] = useState(null);

  useEffect(() => {
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('checkout_status', 'waitlist')
      .not('email', 'in', '("test@bysolum.com")')
      .then(({ count }) => setWaitlistCount(count || 0));
  }, []);

  useEffect(() => {
    const fired = new Set();
    function onScroll() {
      const pct = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
      [25, 50, 75, 100].forEach(depth => {
        if (!fired.has(depth) && pct >= depth / 100) {
          fired.add(depth);
          capture('Scroll Depth', { percent: `${depth}%`, page: 'athlete' });
        }
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function handleSuccess() {
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('checkout_status', 'waitlist')
      .not('email', 'in', '("test@bysolum.com")')
      .then(({ count }) => setWaitlistCount(count || 0));
  }

  return (
    <>
      <style>{styles}</style>
      <div className="ac-wrap">
        <div className="ac-ghost">SOLUM</div>
        <div className="ac-glow" />

        <header className="ac-topbar">
          <span className="ac-logo">SOLUM</span>
          <span className="ac-topbar-tag">Built for Athletes</span>
        </header>

        {/* ── Hero ─────────────────────────────────────────────── */}
        <main className="ac-main">
          <FoundingBar count={waitlistCount} />

          <div className="ac-eyebrow">Athletes shower. Athletes don't actually recover.</div>
          <h1 className="ac-headline">
            You Train Hard.<br /><em>Your Body Still</em><br /><em>Isn't Getting</em><br /><em>This Right.</em>
          </h1>
          <p className="ac-subhead">
            You track your training load, your macros, your sleep. Your skin and body
            recovery is still the same generic shower gel as everyone else.
            Nobody built athletes a proper body system. SOLUM fixes that.
            Eight products. Two rituals. Built around how hard your body actually works.
          </p>

          <div className="ac-urgency">Don't miss out. Spaces filling up fast.</div>
          <WaitlistForm
            label="Get Early Access"
            onSuccess={handleSuccess}
            formId="athlete-hero"
            source="athlete"
          />
          <div className="ac-privacy">No spam · One email when we launch · Unsubscribe any time</div>

          <div className="ac-founder">
            <div className="ac-founder-who">
              <img src="/harsha.jpg" alt="Harsha, Founder" className="ac-founder-img" />
              <div className="ac-founder-label">Harsha, Founder · London</div>
            </div>
            <div className="ac-founder-quote">
              "I spent years thinking body care was just body wash and shampoo. Still dealing with odour returning,
              dry skin, an itchy unclean scalp, areas I wasn't properly cleaning. Especially with a busy routine
              and regular training. No one ever explained what to actually do. Everything in grooming focused on
              the face. The rest of the body was ignored. And I assumed proper body care had to be time consuming.
              It doesn't."
            </div>
          </div>
        </main>

        {/* ── Outcomes ─────────────────────────────────────────── */}
        <div className="ac-outcomes">
          <div className="ac-outcomes-eyebrow">What you'll notice</div>
          <div className="ac-outcomes-heading">
            Most athletes have never actually recovered properly.<br />Here's what changes.
          </div>
          <div className="ac-outcomes-grid">
            {OUTCOMES.map(o => (
              <div key={o.num} className="ac-outcome">
                <div className="ac-outcome-marker">
                  {o.period}<em>{o.num}</em>
                </div>
                <div className="ac-outcome-title">{o.title}</div>
                <div className="ac-outcome-body">{o.body}</div>
                <div className="ac-outcome-tag">{o.tag}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Products ─────────────────────────────────────────── */}
        <div className="ac-products-wrap">
          <div className="ac-products-label">The Complete System</div>
          <div className="ac-products-heading">
            Eight products built for bodies that work harder than average.
          </div>
          <div className="ac-products-grid">
            {PRODUCTS.filter(p => !p.comingSoon).map(p => {
              const isWeekly = p.tag?.toLowerCase().includes('weekly');
              return (
                <div key={p.num} className="ac-prod-card">
                  <div className="ac-prod-img-wrap">
                    {p.image && <img src={p.image} alt={p.fullName} loading="lazy" />}
                  </div>
                  <div className="ac-prod-num">{p.num}</div>
                  <div className="ac-prod-name">{p.name}</div>
                  <div className="ac-prod-tagline">{p.tagline}</div>
                  <div className="ac-prod-freq">
                    <span className={`ac-freq-dot ${isWeekly ? 'weekly' : 'daily'}`} />
                    <span className={`ac-freq-label ${isWeekly ? 'weekly' : 'daily'}`}>
                      {isWeekly ? 'Weekly' : 'Daily'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Ritual teaser ─────────────────────────────────────── */}
        <div className="ac-ritual-wrap">
          <div className="ac-ritual-header">
            <div className="ac-ritual-eyebrow">The Body Routine</div>
            <div className="ac-ritual-title">
              10 minutes daily. 22 on recovery day.<br />That's it.
            </div>
            <div className="ac-ritual-sub">Both rituals fit inside your existing training schedule.</div>
          </div>
          <div className="ac-ritual-gate">
            <div className="ac-ritual-steps-preview">
              {[
                { num: '01', name: 'Scalp Massager', type: 'daily' },
                { num: '02', name: 'Body Wash', type: 'daily' },
                { num: '03', name: 'Exfoliating Mitt', type: 'daily' },
                { num: '04', name: 'Back Scrub Cloth', type: 'daily' },
                { num: '05', name: 'Body Lotion', type: 'daily' },
                { num: '06', name: 'Rhassoul Clay Mask', type: 'weekly' },
                { num: '07', name: 'Argan Body Oil', type: 'weekly' },
              ].map((s, i) => (
                <div key={s.num} className="ac-ritual-step" style={{ opacity: i > 1 ? 0.2 : 1 }}>
                  <span className={`ac-step-num ${s.type}`}>{s.num}</span>
                  <span className="ac-step-name">{s.name}</span>
                </div>
              ))}
            </div>
            <div className="ac-ritual-blur-overlay">
              <div className="ac-gate-label">Step by step guide · Execution notes · Tool care</div>
              <div className="ac-gate-title">The full ritual guide.<br />Every step. Every tool.</div>
              <a
                href="#signup-form"
                className="ac-gate-cta"
                onClick={e => { e.preventDefault(); document.getElementById('ac-signup')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
              >
                Sign Up to Unlock
              </a>
            </div>
          </div>
        </div>

        {/* ── Subscription ──────────────────────────────────────── */}
        <div className="ac-sub">
          <div className="ac-sub-tag">Subscription</div>
          <div className="ac-sub-title">Your system.<br />On autopilot.</div>
          <div className="ac-sub-body">
            The tools last months. The consumables run out. Your monthly
            refill arrives automatically — body wash, lotion, clay, oil.
            The ritual never stops. You never have to think about it.
          </div>
          <div className="ac-sub-items">
            <div className="ac-sub-item">
              <div className="ac-sub-item-tag">First Box</div>
              <div className="ac-sub-item-title">Your ritual starts day one</div>
              <div className="ac-sub-item-body">All products arrive together. Tools and consumables. Everything you need to run both rituals from the moment the box opens.</div>
            </div>
            <div className="ac-sub-item">
              <div className="ac-sub-item-tag">Monthly Refill</div>
              <div className="ac-sub-item-title">The ritual never stops</div>
              <div className="ac-sub-item-body">Consumables replenished automatically before you run out. The tools stay in your bathroom. They last 6–12 months.</div>
            </div>
            <div className="ac-sub-item">
              <div className="ac-sub-item-tag">66 days</div>
              <div className="ac-sub-item-title">Then it's just how you train</div>
              <div className="ac-sub-item-body">By day 66 you've gone through two full cycles of new skin. The routine is muscle memory. You don't decide to do it. You just do it.</div>
            </div>
          </div>
        </div>

        {/* ── Bottom CTA ───────────────────────────────────────── */}
        <div className="ac-cta2" id="ac-signup">
          <div className="ac-cta2-headline">Early access spots are going.</div>
          <div className="ac-cta2-sub">
            Be first. Your box ships before everyone else.
          </div>
          <div style={{ fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 500, color: '#c8a96e', marginBottom: 12 }}>
            Don't miss out. Spaces filling up fast.
          </div>
          <WaitlistForm
            label="Get Early Access"
            onSuccess={handleSuccess}
            formId="athlete-bottom"
            source="athlete"
          />
          <div className="ac-privacy" style={{ marginTop: 12 }}>No spam · One email when we launch · Unsubscribe any time</div>
        </div>

        {/* ── Marquee ───────────────────────────────────────────── */}
        <div className="ac-marquee-wrap">
          <div className="ac-marquee-track">
            {MARQUEE_ITEMS.map((item, i) => (
              <span key={i} className="ac-marquee-item">
                {item}<span className="ac-marquee-dot">·</span>
              </span>
            ))}
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────── */}
        <footer className="ac-footer">
          <div className="ac-footer-logo">SOLUM</div>
          <div className="ac-footer-links">
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </div>
        </footer>
      </div>
    </>
  );
}
