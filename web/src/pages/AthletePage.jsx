import { useEffect, useState } from 'react';
import Nav from '../components/Nav.jsx';
import KitComparison from '../components/KitComparison.jsx';
import SolumFooter from '../components/SolumFooter.jsx';
import { trackGoal } from '../hooks/useVariant';
import { axonEvent } from '../lib/analytics';

const IS_LIVE = import.meta.env.VITE_LAUNCH_MODE === 'live';
const PRIMARY_CTA = IS_LIVE ? '#kits' : '#athlete-waitlist';

const CSS = `
/* ─── Reset ─────────────────────────────────────────────── */
.ath-page { background: var(--black); }

/* ─── Hero ───────────────────────────────────────────────── */
.ath-hero {
  min-height: 100vh;
  display: flex;
  align-items: flex-end;
  padding: 80px 48px 80px;
  position: relative;
  overflow: hidden;
  background: var(--black);
}
.ath-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background-image:
    linear-gradient(rgba(46,109,164,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(46,109,164,0.03) 1px, transparent 1px);
  background-size: 80px 80px;
  animation: athGridFade 3s ease forwards;
}
@keyframes athGridFade { from { opacity: 0; } to { opacity: 1; } }
.ath-hero-ghost {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -52%);
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(180px, 22vw, 340px);
  letter-spacing: -0.04em;
  color: transparent;
  -webkit-text-stroke: 1px rgba(46,109,164,0.07);
  pointer-events: none;
  user-select: none;
  white-space: nowrap;
  animation: athGhostIn 2s cubic-bezier(.16,1,.3,1) .3s both;
}
@keyframes athGhostIn {
  from { opacity: 0; transform: translate(-50%,-48%) scale(.96); }
  to   { opacity: 1; transform: translate(-50%,-52%) scale(1); }
}
.ath-hero-glow {
  position: absolute;
  top: 30%; left: 35%;
  transform: translate(-50%, -50%);
  width: 900px; height: 700px;
  background: radial-gradient(ellipse, rgba(46,109,164,0.06) 0%, transparent 70%);
  pointer-events: none;
}
.ath-hero-cols {
  position: relative; z-index: 1;
  display: flex;
  align-items: flex-end;
  width: 100%;
  gap: 48px;
}
.ath-hero-content { flex: 0 0 58%; max-width: 640px; }
.ath-hero-eyebrow {
  font-size: 13px;
  letter-spacing: 6px;
  text-transform: uppercase;
  color: var(--blit);
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  animation: athFadeUp .8s ease .6s both;
}
.ath-hero-eyebrow::before {
  content: '';
  width: 32px; height: 1px;
  background: var(--blue);
}
.ath-hero-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(58px, 6.2vw, 100px);
  line-height: .92;
  letter-spacing: 0.03em;
  color: var(--bone);
  margin-bottom: 32px;
  animation: athFadeUp .8s ease .75s both;
}
.ath-hero-title em { font-style: normal; color: var(--blue); }
.ath-hero-line {
  width: 100%; height: 1px;
  background: linear-gradient(to right, var(--blue) 0%, transparent 60%);
  margin-bottom: 28px;
  animation: athLineIn 1s ease 1s both;
  transform-origin: left;
}
@keyframes athLineIn {
  from { transform: scaleX(0); opacity: 0; }
  to   { transform: scaleX(1); opacity: 1; }
}
.ath-hero-body {
  font-size: 17px; font-weight: 300;
  letter-spacing: .3px;
  color: var(--mist);
  line-height: 1.7;
  margin-bottom: 20px;
  animation: athFadeUp .8s ease .9s both;
}
.ath-hero-scope {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--lineb);
  padding: 9px 18px;
  margin-bottom: 40px;
  animation: athFadeUp .8s ease .95s both;
}
.ath-hero-scope-label { font-size: 11px; letter-spacing: 4px; text-transform: uppercase; color: var(--blit); font-weight: 600; }
.ath-hero-scope-div   { width: 1px; height: 14px; background: var(--lineb); }
.ath-hero-scope-note  { font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: var(--stone); }
.ath-hero-actions {
  display: flex; gap: 16px; align-items: center;
  animation: athFadeUp .8s ease 1.05s both;
}
.ath-hero-stats {
  flex: 0 0 38%;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-bottom: 8px;
  animation: athFadeUp .8s ease .5s both;
}
.ath-stat-card {
  background: var(--char);
  border: 1px solid var(--lineb);
  border-left: 3px solid var(--blue);
  padding: 24px 28px;
}
.ath-stat-num {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 52px;
  letter-spacing: -1px;
  color: var(--bone);
  line-height: 1;
  margin-bottom: 4px;
}
.ath-stat-num em { font-style: normal; color: var(--blue); }
.ath-stat-label {
  font-size: 13px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--stone);
  font-weight: 600;
  margin-bottom: 8px;
}
.ath-stat-note { font-size: 14px; color: var(--mist); font-weight: 300; line-height: 1.6; }

/* ─── Truths ──────────────────────────────────────────────── */
.ath-truths {
  background: var(--char);
  padding: 100px 48px;
  border-top: 1px solid var(--line);
}
.ath-truths-inner { max-width: 1400px; margin: 0 auto; }
.ath-truths-tag {
  font-size: 11px; letter-spacing: 6px; text-transform: uppercase;
  color: var(--blit); font-weight: 600; margin-bottom: 16px;
}
.ath-truths h2 {
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(36px, 4vw, 64px);
  letter-spacing: .06em;
  color: var(--bone);
  line-height: 1.05;
  margin-bottom: 64px;
  max-width: 600px;
}
.ath-truths-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: var(--line);
}
.ath-truth-col {
  background: var(--char);
  padding: 40px 36px;
}
.ath-truth-num {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 72px;
  line-height: 1;
  color: transparent;
  -webkit-text-stroke: 1px rgba(46,109,164,0.25);
  margin-bottom: 24px;
}
.ath-truth-h {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 28px;
  letter-spacing: .06em;
  color: var(--bone);
  margin-bottom: 16px;
  line-height: 1.1;
}
.ath-truth-body {
  font-size: 15px; font-weight: 300;
  color: var(--mist);
  line-height: 1.75;
}
.ath-truth-body strong { color: var(--bone); font-weight: 600; }

/* ─── Training fit ────────────────────────────────────────── */
.ath-training {
  background: var(--black);
  padding: 100px 48px;
  border-top: 1px solid var(--line);
}
.ath-training-inner {
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: start;
}
.ath-training-tag {
  font-size: 11px; letter-spacing: 6px; text-transform: uppercase;
  color: var(--blit); font-weight: 600; margin-bottom: 16px;
}
.ath-training h2 {
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(36px, 4vw, 60px);
  letter-spacing: .06em;
  color: var(--bone);
  line-height: 1.05;
  margin-bottom: 20px;
}
.ath-training-intro {
  font-size: 16px; font-weight: 300;
  color: var(--mist);
  line-height: 1.7;
  margin-bottom: 40px;
}
.ath-ritual-block { margin-bottom: 40px; }
.ath-ritual-header {
  display: flex; align-items: center; gap: 16px;
  margin-bottom: 20px;
}
.ath-ritual-badge {
  font-size: 10px; letter-spacing: 4px; text-transform: uppercase;
  font-weight: 700; padding: 5px 12px;
}
.ath-ritual-badge.daily  { background: var(--blue);  color: var(--bone); }
.ath-ritual-badge.weekly { background: transparent; color: #c9a84c; border: 1px solid #c9a84c; }
.ath-ritual-badge-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 22px; letter-spacing: .06em; color: var(--bone);
}
.ath-ritual-time {
  font-size: 13px; letter-spacing: 3px; text-transform: uppercase;
  color: var(--stone); font-weight: 600; margin-left: auto;
}
.ath-ritual-steps { display: flex; flex-direction: column; gap: 12px; }
.ath-ritual-step {
  display: flex; align-items: flex-start; gap: 16px;
  padding: 14px 20px;
  border: 1px solid var(--lineb);
  background: var(--char);
}
.ath-step-num {
  font-size: 10px; letter-spacing: 3px; text-transform: uppercase;
  color: var(--blue); font-weight: 700; min-width: 24px; padding-top: 2px;
}
.ath-step-content {}
.ath-step-name {
  font-size: 14px; font-weight: 600; color: var(--bone);
  letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px;
}
.ath-step-desc { font-size: 13px; font-weight: 300; color: var(--mist); line-height: 1.6; }
.ath-training-right { padding-top: 56px; }
.ath-performance-block {
  background: var(--char);
  border: 1px solid var(--lineb);
  border-top: 3px solid var(--blue);
  padding: 36px 32px;
  margin-bottom: 24px;
}
.ath-perf-tag {
  font-size: 10px; letter-spacing: 5px; text-transform: uppercase;
  color: var(--blit); font-weight: 600; margin-bottom: 20px;
}
.ath-perf-row {
  display: flex; justify-content: space-between; align-items: baseline;
  padding: 12px 0;
  border-bottom: 1px solid var(--lineb);
}
.ath-perf-row:last-child { border-bottom: none; }
.ath-perf-label { font-size: 13px; color: var(--mist); font-weight: 300; }
.ath-perf-val   { font-size: 13px; color: var(--bone); font-weight: 600; letter-spacing: 1px; }
.ath-perf-val.accent { color: var(--blit); }
.ath-week-block {
  background: var(--char);
  border: 1px solid var(--lineb);
  padding: 28px 28px;
}
.ath-week-tag {
  font-size: 10px; letter-spacing: 5px; text-transform: uppercase;
  color: var(--stone); font-weight: 600; margin-bottom: 16px;
}
.ath-week-grid {
  display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px;
}
.ath-day {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
}
.ath-day-label {
  font-size: 9px; letter-spacing: 2px; text-transform: uppercase;
  color: var(--stone); font-weight: 600;
}
.ath-day-pip {
  width: 28px; height: 28px; border-radius: 2px;
  display: flex; align-items: center; justify-content: center;
  font-size: 9px; letter-spacing: 1px; font-weight: 700;
}
.ath-day-pip.daily  { background: rgba(46,109,164,0.25); border: 1px solid var(--blue); color: var(--blit); }
.ath-day-pip.weekly { background: rgba(201,168,76,0.15); border: 1px solid #c9a84c; color: #c9a84c; }
.ath-day-pip.rest   { background: var(--dark); border: 1px solid var(--lineb); color: var(--stone); }

/* ─── Team ────────────────────────────────────────────────── */
.ath-team {
  background: var(--char);
  padding: 100px 48px;
  border-top: 1px solid var(--line);
}
.ath-team-inner {
  max-width: 1400px; margin: 0 auto;
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 80px; align-items: start;
}
.ath-team-tag {
  font-size: 11px; letter-spacing: 6px; text-transform: uppercase;
  color: var(--blit); font-weight: 600; margin-bottom: 16px;
}
.ath-team h2 {
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(36px, 3.5vw, 56px);
  letter-spacing: .06em;
  color: var(--bone);
  line-height: 1.05;
  margin-bottom: 20px;
}
.ath-team-body {
  font-size: 16px; font-weight: 300;
  color: var(--mist);
  line-height: 1.75;
  margin-bottom: 32px;
}
.ath-team-points { display: flex; flex-direction: column; gap: 16px; margin-bottom: 40px; }
.ath-team-point {
  display: flex; align-items: flex-start; gap: 16px;
  font-size: 15px; color: var(--mist); font-weight: 300; line-height: 1.6;
}
.ath-team-point-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--blue); margin-top: 7px; flex-shrink: 0;
}
.ath-team-cta-row { display: flex; gap: 16px; align-items: center; }
.ath-team-right { display: flex; flex-direction: column; gap: 24px; }
.ath-team-card {
  background: var(--black);
  border: 1px solid var(--lineb);
  padding: 36px 32px;
}
.ath-team-card-tag {
  font-size: 10px; letter-spacing: 5px; text-transform: uppercase;
  color: var(--blit); font-weight: 600; margin-bottom: 16px;
}
.ath-team-card h3 {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 28px; letter-spacing: .06em;
  color: var(--bone); margin-bottom: 12px;
}
.ath-team-card p {
  font-size: 14px; font-weight: 300;
  color: var(--mist); line-height: 1.7;
}
.ath-team-card-meta {
  margin-top: 20px;
  display: flex; flex-direction: column; gap: 8px;
}
.ath-team-meta-row {
  display: flex; justify-content: space-between;
  font-size: 13px;
  border-bottom: 1px solid var(--lineb);
  padding-bottom: 8px;
}
.ath-team-meta-row:last-child { border-bottom: none; }
.ath-meta-key { color: var(--stone); font-weight: 400; }
.ath-meta-val { color: var(--bone); font-weight: 600; }

/* ─── Bottom CTA ──────────────────────────────────────────── */
.ath-cta {
  background: var(--black);
  padding: 120px 48px;
  border-top: 1px solid var(--line);
  text-align: center;
}
.ath-cta-inner { max-width: 720px; margin: 0 auto; }
.ath-cta-tag {
  font-size: 11px; letter-spacing: 6px; text-transform: uppercase;
  color: var(--blit); font-weight: 600; margin-bottom: 20px;
}
.ath-cta h2 {
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(44px, 5vw, 76px);
  letter-spacing: .04em;
  color: var(--bone);
  line-height: 1;
  margin-bottom: 20px;
}
.ath-cta-body {
  font-size: 17px; font-weight: 300;
  color: var(--mist); line-height: 1.7;
  margin-bottom: 40px;
}
.ath-cta-actions { display: flex; gap: 16px; align-items: center; justify-content: center; }

/* ─── Shared buttons ──────────────────────────────────────── */
.ath-btn-primary {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 16px; letter-spacing: 0.12em;
  background: var(--bone); color: var(--black);
  padding: 16px 40px;
  text-decoration: none;
  display: inline-block;
  transition: background .2s, transform .15s;
  border: none; cursor: pointer;
}
.ath-btn-primary:hover { background: #fff; transform: translateY(-1px); }
.ath-btn-ghost {
  font-size: 13px; letter-spacing: 4px; text-transform: uppercase;
  color: var(--stone); text-decoration: none;
  border-bottom: 1px solid var(--lineb);
  padding-bottom: 3px;
  transition: color .2s, border-color .2s;
}
.ath-btn-ghost:hover { color: var(--bone); border-color: var(--blue); }

/* ─── Animations ──────────────────────────────────────────── */
@keyframes athFadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ─── Responsive ──────────────────────────────────────────── */
@media (max-width: 960px) {
  .ath-hero-stats { display: none; }
  .ath-hero-content { flex: 1; max-width: 100%; }
  .ath-truths-grid  { grid-template-columns: 1fr; }
  .ath-training-inner { grid-template-columns: 1fr; gap: 48px; }
  .ath-training-right { padding-top: 0; }
  .ath-team-inner   { grid-template-columns: 1fr; gap: 48px; }
}
@media (max-width: 768px) {
  .ath-hero { padding: 80px 24px 60px; }
  .ath-hero-title { font-size: clamp(48px, 12vw, 80px); }
  .ath-truths, .ath-training, .ath-team, .ath-cta, .ath-wl { padding: 60px 24px; }
}

/* ─── Waitlist ────────────────────────────────────────────── */
.ath-wl {
  background: var(--deep);
  padding: 100px 48px;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}
.ath-wl-inner { max-width: 760px; margin: 0 auto; }
.ath-wl-tag {
  font-size: 11px; letter-spacing: 6px; text-transform: uppercase;
  color: var(--blit); font-weight: 600; margin-bottom: 16px;
}
.ath-wl h2 {
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(36px, 4vw, 60px);
  letter-spacing: .06em; color: var(--bone);
  line-height: 1.05; margin-bottom: 16px;
}
.ath-wl-body {
  font-size: 16px; font-weight: 300;
  color: var(--mist); line-height: 1.7; margin-bottom: 40px;
}
.ath-wl-form { display: flex; gap: 0; max-width: 520px; }
.ath-wl-input {
  flex: 1;
  background: var(--char);
  border: 1px solid var(--lineb);
  border-right: none;
  color: var(--bone);
  font-size: 15px; font-weight: 300;
  padding: 16px 20px;
  outline: none;
  font-family: 'Barlow Condensed', sans-serif;
  letter-spacing: .5px;
}
.ath-wl-input::placeholder { color: var(--stone); }
.ath-wl-input:focus { border-color: var(--blue); }
.ath-wl-submit {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 15px; letter-spacing: .1em;
  background: var(--bone); color: var(--black);
  border: none; padding: 16px 32px;
  cursor: pointer; transition: background .2s;
  white-space: nowrap;
}
.ath-wl-submit:hover { background: #fff; }
.ath-wl-submit:disabled { background: var(--stone); cursor: default; }
.ath-wl-error { margin-top: 12px; font-size: 13px; color: #e05a5a; font-weight: 400; }
.ath-wl-privacy { margin-top: 12px; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: var(--stone); }
.ath-wl-success { display: flex; flex-direction: column; gap: 8px; }
.ath-wl-success-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 48px; letter-spacing: .06em; color: var(--bone); line-height: 1;
}
.ath-wl-success-title em { font-style: normal; color: var(--blue); }
.ath-wl-success-body { font-size: 15px; font-weight: 300; color: var(--mist); line-height: 1.7; }
`;

const DAILY_STEPS = [
  { num: '01', name: 'Scalp Massager', desc: 'Small firm circles, hairline to back. 2–3 min. Dislodges sweat and build-up from training.' },
  { num: '02', name: 'Body Wash', desc: 'Amino acid formula. Cleans without stripping your skin barrier — critical if you shower twice a day.' },
  { num: '03', name: 'Exfoliating Mitt', desc: 'Long circular strokes on arms, chest, legs. Korean bathhouse technique. Removes dead skin + sweat residue.' },
  { num: '04', name: 'Back Cloth', desc: 'One handle each hand over the shoulder. The only way to actually clean your back properly.' },
  { num: '05', name: 'Body Lotion', desc: 'Within 3 minutes of towelling. 70% more absorption while skin is still warm from the shower.' },
];

const WEEKLY_STEPS = [
  { num: '01', name: 'Deep Scalp Massage', desc: '5 minutes, more pressure. After a heavy training week — your scalp needs it.' },
  { num: '02', name: 'Rhassoul Clay Mask', desc: 'Apply to damp skin. Leave 8–10 minutes. Moroccan Atlas clay draws out what no shower gel touches.' },
  { num: '03', name: 'Kese Mitt + Back Cloth', desc: 'Firm slow strokes. Dead skin rolls off. The weekly reset your body is waiting for.' },
  { num: '04', name: 'Argan Body Oil', desc: 'Stay damp. 10–15 drops pressed in — not rubbed. No lotion needed. Skin stays fed for 24 hours.' },
];

const DAYS = [
  { label: 'MON', type: 'daily',  text: 'D' },
  { label: 'TUE', type: 'daily',  text: 'D' },
  { label: 'WED', type: 'daily',  text: 'D' },
  { label: 'THU', type: 'daily',  text: 'D' },
  { label: 'FRI', type: 'daily',  text: 'D' },
  { label: 'SAT', type: 'weekly', text: 'W' },
  { label: 'SUN', type: 'rest',   text: '—' },
];

function AthleteWaitlistForm() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState(null);
  const [error, setError]     = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/join-waitlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ email: email.trim(), source: 'athlete', first_name: null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong. Try again.'); return; }
      setPosition(data.position);
      trackGoal('Waitlist Signup', { cta: 'athlete-page', source: 'athlete', position: String(data.position) });
      if (window.fbq) window.fbq('track', 'Lead');
      axonEvent('generate_lead', {
        currency: 'GBP',
        value: 85,
        user_data: { email: email.trim() },
      });
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  if (position !== null) {
    return (
      <div className="ath-wl-success">
        <div className="ath-wl-success-title">You're in. <em>#{position}</em> on the list.</div>
        <div className="ath-wl-success-body">One email when we launch. First to get access.</div>
      </div>
    );
  }

  return (
    <form className="ath-wl-form" onSubmit={handleSubmit}>
      <input
        className="ath-wl-input"
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Your email address"
        autoComplete="email"
        required
      />
      <button className="ath-wl-submit" type="submit" disabled={loading}>
        {loading ? 'Joining…' : 'Get Early Access'}
      </button>
      {error && <div className="ath-wl-error">{error}</div>}
    </form>
  );
}

export default function AthletePage() {
  useEffect(() => {
    trackGoal('athlete_page_viewed', {});
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add('visible'), i * 80);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' });
    const timer = setTimeout(() => {
      document.querySelectorAll('.reveal,.reveal-left').forEach(el => obs.observe(el));
    }, 100);
    return () => { clearTimeout(timer); obs.disconnect(); };
  }, []);

  return (
    <>
      <style>{CSS}</style>
      <div className="ath-page">
        <Nav />

        {/* ── Hero ────────────────────────────────────────────── */}
        <section className="ath-hero">
          <div className="ath-hero-ghost">SOLUM</div>
          <div className="ath-hero-glow" />
          <div className="ath-hero-cols">
            <div className="ath-hero-content">
              <div className="ath-hero-eyebrow">Built for bodies that work harder</div>
              <h1 className="ath-hero-title">
                You Train.<br />You Recover.<br /><em>Your Body</em><br /><em>Still Isn't</em><br /><em>Getting This Right.</em>
              </h1>
              <div className="ath-hero-line" />
              <p className="ath-hero-body">
                Athletes optimise everything — training load, nutrition, sleep. Nobody ever built a body care system
                that matches the effort you put in. You're still using the same shower gel as everyone else.
                SOLUM fixes that. Eight products. Ten minutes. The ritual your body has been waiting for.
              </p>
              <div className="ath-hero-scope">
                <span className="ath-hero-scope-label">10 Min Daily</span>
                <span className="ath-hero-scope-div" />
                <span className="ath-hero-scope-note">22 Min Weekly Recovery</span>
              </div>
              <div className="ath-hero-actions">
                <a
                  href={PRIMARY_CTA}
                  className="ath-btn-primary"
                  onClick={() => trackGoal('athlete_cta_clicked', { location: 'hero', mode: IS_LIVE ? 'live' : 'prelaunch' })}
                >
                  {IS_LIVE ? 'Build Your Kit' : 'Get Early Access'}
                </a>
                <a href="#athlete-why" className="ath-btn-ghost">Why It Matters</a>
              </div>
            </div>
            <div className="ath-hero-stats">
              <div className="ath-stat-card">
                <div className="ath-stat-num"><em>70%</em></div>
                <div className="ath-stat-label">More Moisture</div>
                <div className="ath-stat-note">Skin absorbs 70% more moisture within 3 minutes of towelling. Most men wait 10+ minutes. The window closes.</div>
              </div>
              <div className="ath-stat-card">
                <div className="ath-stat-num"><em>100%</em></div>
                <div className="ath-stat-label">Of Your Back</div>
                <div className="ath-stat-note">Most men have never properly cleaned their back. The back cloth reaches everywhere — including the areas you can't reach with a hand.</div>
              </div>
              <div className="ath-stat-card">
                <div className="ath-stat-num">8<em>×</em></div>
                <div className="ath-stat-label">Products. One System.</div>
                <div className="ath-stat-note">Sourced from Korea, Morocco, Turkey, and the UK. Every product has a specific job. Nothing overlaps.</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Three Truths ─────────────────────────────────────── */}
        <section className="ath-truths" id="athlete-why">
          <div className="ath-truths-inner">
            <div className="ath-truths-tag reveal">For athletes specifically</div>
            <h2 className="reveal">Three Things<br />Your Body Is<br />Dealing With.</h2>
            <div className="ath-truths-grid reveal">
              <div className="ath-truth-col">
                <div className="ath-truth-num">01</div>
                <div className="ath-truth-h">Your skin is under more stress than you think.</div>
                <p className="ath-truth-body">
                  Sweat, friction, sunscreen, grass, chalk. You train hard. Your skin takes the same punishment.
                  <strong> Standard shower gel sits on the surface — it doesn't remove what training leaves behind.</strong>
                  Dead skin feeds odour bacteria. Athletes carry more of it, more often.
                  The exfoliating mitt removes it in under two minutes. You'll see it on the mitt after the first use.
                </p>
              </div>
              <div className="ath-truth-col">
                <div className="ath-truth-num">02</div>
                <div className="ath-truth-h">Your back has never been properly cleaned.</div>
                <p className="ath-truth-body">
                  The back is loaded with sweat glands and is the hardest area to reach.
                  <strong> Back acne isn't random — it's build-up that never gets properly removed.</strong>
                  A hand can't reach it. A loofah doesn't cover it. The back scrub cloth has handles on both ends.
                  Drape it over your shoulder. Sixty seconds. The only tool that actually cleans your back.
                </p>
              </div>
              <div className="ath-truth-col">
                <div className="ath-truth-num">03</div>
                <div className="ath-truth-h">Scalp health affects more than your hair.</div>
                <p className="ath-truth-body">
                  During training, your scalp sweats more than any other area.
                  <strong> Regular shampoo sits on top — it doesn't get under the hair to the skin.</strong>
                  The silicone scalp massager breaks up build-up, stimulates blood flow, and turns a
                  two-minute wash into something that actually works. Daily, during shampoo. Two minutes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Kit Comparison ───────────────────────────────────── */}
        <KitComparison />

        {/* ── Training Fit ─────────────────────────────────────── */}
        <section className="ath-training">
          <div className="ath-training-inner">
            <div>
              <div className="ath-training-tag reveal">The rituals</div>
              <h2 className="reveal">Fits Your<br />Training Week.</h2>
              <p className="ath-training-intro reveal">
                Not extra sessions. The daily ritual replaces your existing shower.
                The weekly ritual replaces one of them on your recovery day. That's it.
              </p>
              <div className="ath-ritual-block reveal">
                <div className="ath-ritual-header">
                  <span className="ath-ritual-badge daily">Daily</span>
                  <span className="ath-ritual-badge-title">Morning Ritual</span>
                  <span className="ath-ritual-time">10 min</span>
                </div>
                <div className="ath-ritual-steps">
                  {DAILY_STEPS.map(s => (
                    <div key={s.num} className="ath-ritual-step">
                      <span className="ath-step-num">{s.num}</span>
                      <div className="ath-step-content">
                        <div className="ath-step-name">{s.name}</div>
                        <div className="ath-step-desc">{s.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="ath-ritual-block reveal">
                <div className="ath-ritual-header">
                  <span className="ath-ritual-badge weekly">Weekly</span>
                  <span className="ath-ritual-badge-title">Recovery Ritual</span>
                  <span className="ath-ritual-time">22 min</span>
                </div>
                <div className="ath-ritual-steps">
                  {WEEKLY_STEPS.map(s => (
                    <div key={s.num} className="ath-ritual-step">
                      <span className="ath-step-num">{s.num}</span>
                      <div className="ath-step-content">
                        <div className="ath-step-name">{s.name}</div>
                        <div className="ath-step-desc">{s.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="ath-training-right">
              <div className="ath-performance-block reveal">
                <div className="ath-perf-tag">What changes — week by week</div>
                <div className="ath-perf-row">
                  <span className="ath-perf-label">Week 1</span>
                  <span className="ath-perf-val accent">Dead skin visible on mitt after first use</span>
                </div>
                <div className="ath-perf-row">
                  <span className="ath-perf-label">Week 1–2</span>
                  <span className="ath-perf-val">Post-training odour reduces noticeably</span>
                </div>
                <div className="ath-perf-row">
                  <span className="ath-perf-label">Week 2</span>
                  <span className="ath-perf-val">Scalp less oily between washes</span>
                </div>
                <div className="ath-perf-row">
                  <span className="ath-perf-label">Week 2–3</span>
                  <span className="ath-perf-val">Back skin texture visibly smoother</span>
                </div>
                <div className="ath-perf-row">
                  <span className="ath-perf-label">Week 3–4</span>
                  <span className="ath-perf-val">Skin barrier stronger — less irritation from kit</span>
                </div>
                <div className="ath-perf-row">
                  <span className="ath-perf-label">Week 4+</span>
                  <span className="ath-perf-val accent">Muscle memory — just happens</span>
                </div>
              </div>
              <div className="ath-week-block reveal">
                <div className="ath-week-tag">Typical training week</div>
                <div className="ath-week-grid">
                  {DAYS.map(d => (
                    <div key={d.label} className="ath-day">
                      <span className="ath-day-label">{d.label}</span>
                      <span className={`ath-day-pip ${d.type}`}>{d.text}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '16px', display: 'flex', gap: '20px' }}>
                  <span style={{ fontSize: '11px', letterSpacing: '2px', color: 'var(--blit)', fontWeight: 600 }}>D — DAILY (10 min)</span>
                  <span style={{ fontSize: '11px', letterSpacing: '2px', color: '#c9a84c', fontWeight: 600 }}>W — WEEKLY (22 min)</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Waitlist (pre-launch only) ───────────────────────── */}
        {!IS_LIVE && (
          <section className="ath-wl" id="athlete-waitlist">
            <div className="ath-wl-inner reveal">
              <div className="ath-wl-tag">Early access</div>
              <h2>Be First.<br />Launch Is Close.</h2>
              <p className="ath-wl-body">
                We're weeks away from shipping. Get on the list now and you'll be
                first to know — plus first access to founding member pricing.
                No spam. One email when we launch.
              </p>
              <AthleteWaitlistForm />
              <div className="ath-wl-privacy">No spam · One email on launch day · Unsubscribe any time</div>
            </div>
          </section>
        )}

        {/* ── Team / Bulk ───────────────────────────────────────── */}
        <section className="ath-team" id="team-kits">
          <div className="ath-team-inner">
            <div>
              <div className="ath-team-tag reveal">For performance centres</div>
              <h2 className="reveal">Equipping<br />Squads &amp;<br />Academies.</h2>
              <p className="ath-team-body reveal">
                We work with performance centres, academies, and coaching teams to put the right tools
                in athletes' hands. Bulk orders get bespoke pricing, single-delivery logistics,
                and onboarding cards explaining the system to each athlete.
              </p>
              <div className="ath-team-points reveal">
                <div className="ath-team-point">
                  <span className="ath-team-point-dot" />
                  <span>Minimum 20 kits — custom pricing on volume</span>
                </div>
                <div className="ath-team-point">
                  <span className="ath-team-point-dot" />
                  <span>Ritual card with each kit — athletes understand what to do and why immediately</span>
                </div>
                <div className="ath-team-point">
                  <span className="ath-team-point-dot" />
                  <span>Single delivery to your facility — no individual drop-shipping complications</span>
                </div>
                <div className="ath-team-point">
                  <span className="ath-team-point-dot" />
                  <span>Optional branded insert for your programme — name the kit as part of your recovery protocol</span>
                </div>
              </div>
              <div className="ath-team-cta-row reveal">
                <a
                  href="mailto:harsha@bysolum.co.uk?subject=Team%20Kit%20Inquiry"
                  className="ath-btn-primary"
                  onClick={() => trackGoal('athlete_team_inquiry_clicked', {})}
                >
                  Get Team Pricing
                </a>
                <a href="#kits" className="ath-btn-ghost">Individual Kits</a>
              </div>
            </div>
            <div className="ath-team-right">
              <div className="ath-team-card reveal">
                <div className="ath-team-card-tag">Team order details</div>
                <h3>What's Included</h3>
                <p>Each kit contains the complete SOLUM system — tools, consumables, and ritual card. Kits are sent in a matte black box, ready to hand to athletes directly.</p>
                <div className="ath-team-card-meta">
                  <div className="ath-team-meta-row">
                    <span className="ath-meta-key">Kit options</span>
                    <span className="ath-meta-val">GROUND · RITUAL</span>
                  </div>
                  <div className="ath-team-meta-row">
                    <span className="ath-meta-key">Minimum order</span>
                    <span className="ath-meta-val">20 kits</span>
                  </div>
                  <div className="ath-team-meta-row">
                    <span className="ath-meta-key">Lead time</span>
                    <span className="ath-meta-val">7–14 days</span>
                  </div>
                  <div className="ath-team-meta-row">
                    <span className="ath-meta-key">Delivery</span>
                    <span className="ath-meta-val">Single shipment to facility</span>
                  </div>
                  <div className="ath-team-meta-row">
                    <span className="ath-meta-key">Invoice terms</span>
                    <span className="ath-meta-val">Pro-forma available</span>
                  </div>
                </div>
              </div>
              <div className="ath-team-card reveal">
                <div className="ath-team-card-tag">How to proceed</div>
                <h3>Get In Touch</h3>
                <p>Email with the number of kits required, which kit tier, and your facility name. We'll confirm stock, send pricing, and agree a delivery date.</p>
                <div style={{ marginTop: '20px' }}>
                  <a
                    href="mailto:harsha@bysolum.co.uk?subject=Team%20Kit%20Inquiry"
                    style={{ fontSize: '13px', letterSpacing: '3px', color: 'var(--blit)', textDecoration: 'none', textTransform: 'uppercase', fontWeight: 600, borderBottom: '1px solid var(--lineb)', paddingBottom: '2px' }}
                  >
                    harsha@bysolum.co.uk →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Bottom CTA ───────────────────────────────────────── */}
        <section className="ath-cta">
          <div className="ath-cta-inner reveal">
            <div className="ath-cta-tag">SOLUM · Your body. Done right.</div>
            <h2>Stop Optimising<br />Everything Else<br />First.</h2>
            <p className="ath-cta-body">
              You've sorted the training. The nutrition. The recovery. This is the last piece.
              Ten minutes. Eight products. One system. Done right.
            </p>
            <div className="ath-cta-actions">
              <a
                href={PRIMARY_CTA}
                className="ath-btn-primary"
                onClick={() => trackGoal('athlete_cta_clicked', { location: 'bottom', mode: IS_LIVE ? 'live' : 'prelaunch' })}
              >
                {IS_LIVE ? 'Build Your Ritual' : 'Get Early Access'}
              </a>
              <a
                href={IS_LIVE ? '#team-kits' : '#athlete-waitlist'}
                className="ath-btn-ghost"
                onClick={() => IS_LIVE && trackGoal('athlete_team_inquiry_clicked', {})}
              >
                {IS_LIVE ? 'Team Kits' : 'Learn More'}
              </a>
            </div>
          </div>
        </section>

        <SolumFooter />
      </div>
    </>
  );
}
