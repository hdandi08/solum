import Nav from '../components/Nav';
import SolumFooter from '../components/SolumFooter';
import { useState } from 'react';
import { DAILY_STEPS, WEEKLY_STEPS } from '../data/rituals.js';

const DAILY_DETAIL = {
  '04': {
    how: 'Place flat on scalp. Small firm circles from hairline to crown and back. Keep light-to-medium pressure — you\'re stimulating, not scrubbing.',
    why: 'Breaks up product buildup and stimulates blood flow to the follicle. Most men skip the scalp. Don\'t.',
  },
  '01': {
    how: 'Apply to wet skin, chest down. Work it in with your hands. It lathers lightly — that\'s intentional. No sulphates means no foam theatre.',
    why: 'Amino acid surfactants lift dirt without stripping your skin\'s natural oils. pH balanced to 4.5 — the same as healthy skin.',
  },
  '03': {
    how: 'One handle each hand. Drape over your shoulder, grip both ends. Saw back and forth — upper back, mid back, lower back. 60 seconds.',
    why: 'The only way to properly reach your own back. Most men have never properly cleaned their back. This fixes that.',
  },
  '08': {
    how: 'Wet the cloth, apply a small amount of body wash. Use for sensitive areas that nothing else reaches.',
    why: 'Bamboo weave is gentle enough for daily use. Nothing left uncleaned.',
  },
  '07': {
    how: 'Two pumps. Apply within 3 minutes of towelling — skin is still warm and pores are open. Press in, don\'t rub. Work top to bottom.',
    why: 'Warm skin absorbs 70% more moisture. Miss the 3-minute window and you\'re just coating the surface.',
  },
};

const WEEKLY_DETAIL = {
  '04': {
    how: 'Same technique as daily but 5 full minutes. Slower, more deliberate pressure. Work in rows from front to back.',
    why: 'Extended stimulation promotes follicle health and maximises scalp circulation. Weekly deep session undoes a week of buildup.',
  },
  '05': {
    how: 'Apply to damp skin from head to toe while still in the shower. Leave on 8–10 minutes while you do the rest of the ritual. Rinse off completely.',
    why: 'Atlas Mountain rhassoul clay pulls impurities, excess sebum, and residue that body wash can\'t reach. The clay does the work — give it time.',
  },
  '02': {
    how: 'Wet the mitt, add a small amount of body wash. Firm, slow strokes — top to bottom. Arms, chest, legs. Watch the dead skin roll off.',
    why: 'Viscose rayon is aggressive enough to physically remove dead skin cells. Too harsh for daily use — once a week is exactly right.',
  },
  '08': {
    how: 'Same as daily. Sensitive areas. Don\'t skip.',
    why: 'Even on weekly days, bamboo cloth handles what the mitt shouldn\'t.',
  },
  '06': {
    how: 'After rinsing, towel off lightly — stay damp. 10–15 drops in your palm. Press into skin and hold. Don\'t rub. No lotion needed today.',
    why: 'Certified organic argan oil absorbs fastest on damp skin. Pressing rather than rubbing lets it penetrate instead of sitting on the surface.',
  },
};

const CSS = `
.ritual-page{background:var(--black);min-height:100vh;padding-top:64px;}

.rp-hero{padding:72px 48px 56px;border-bottom:1px solid var(--line);max-width:1400px;margin:0 auto;}
.rp-eyebrow{font-size:11px;letter-spacing:6px;text-transform:uppercase;font-weight:600;color:var(--blit);margin-bottom:14px;}
.rp-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(52px,6vw,88px);letter-spacing:.05em;color:var(--bone);line-height:1;margin-bottom:16px;}
.rp-subtitle{font-size:16px;color:var(--stone);font-weight:300;max-width:520px;line-height:1.6;}

.rp-tabs-bar{border-bottom:1px solid var(--line);padding:0 48px;background:var(--char);}
.rp-tabs-inner{max-width:1400px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;}
.rp-tabs{display:flex;gap:0;}
.rp-tab{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--stone);padding:18px 28px;cursor:pointer;border:none;background:none;border-bottom:2px solid transparent;margin-bottom:-1px;transition:color .2s,border-color .2s;}
.rp-tab:hover{color:var(--bone);}
.rp-tab.active.daily{color:var(--bone);border-bottom-color:var(--blue);}
.rp-tab.active.weekly{color:#c8a96e;border-bottom-color:#c8a96e;}
.rp-total{font-size:11px;letter-spacing:4px;text-transform:uppercase;padding:18px 0;}
.rp-total.daily{color:var(--blit);}
.rp-total.weekly{color:#c8a96e;}

.rp-steps{max-width:1400px;margin:0 auto;padding:0 48px 80px;}
.rp-step{display:grid;grid-template-columns:120px 1fr;gap:48px;padding:48px 0;border-bottom:1px solid var(--line);}
.rp-step:last-child{border-bottom:none;}
.rp-step-left{display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding-top:4px;}
.rp-step-num{font-family:'Bebas Neue',sans-serif;font-size:72px;letter-spacing:.03em;line-height:1;}
.rp-step-num.daily{color:var(--blue);}
.rp-step-num.weekly{color:#c8a96e;}
.rp-step-badge{font-size:10px;letter-spacing:4px;text-transform:uppercase;font-weight:600;padding:5px 10px;border:1px solid;}
.rp-step-badge.daily{color:var(--blit);border-color:rgba(74,143,199,0.3);background:rgba(74,143,199,0.06);}
.rp-step-badge.weekly{color:#c8a96e;border-color:rgba(200,169,110,0.3);background:rgba(200,169,110,0.06);}
.rp-step-right{display:flex;flex-direction:column;gap:20px;}
.rp-step-header{display:flex;align-items:baseline;gap:20px;flex-wrap:wrap;}
.rp-step-name{font-family:'Bebas Neue',sans-serif;font-size:32px;letter-spacing:.08em;color:var(--bone);}
.rp-step-meta{display:flex;gap:12px;flex-wrap:wrap;}
.rp-step-chip{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);background:var(--mid);padding:5px 12px;}
.rp-step-how-label{font-size:10px;letter-spacing:5px;text-transform:uppercase;font-weight:600;color:var(--blit);margin-bottom:6px;}
.rp-step-how-label.weekly{color:#c8a96e;}
.rp-step-how{font-size:16px;color:var(--bone);font-weight:300;line-height:1.65;}
.rp-step-why-label{font-size:10px;letter-spacing:5px;text-transform:uppercase;font-weight:600;color:var(--stone);margin-bottom:6px;margin-top:16px;}
.rp-step-why{font-size:14px;color:var(--stone);font-weight:300;line-height:1.6;}

.rp-cta{background:var(--char);border-top:1px solid var(--lineb);padding:56px 48px;}
.rp-cta-inner{max-width:1400px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:32px;flex-wrap:wrap;}
.rp-cta-copy{}
.rp-cta-title{font-family:'Bebas Neue',sans-serif;font-size:36px;letter-spacing:.06em;color:var(--bone);margin-bottom:8px;}
.rp-cta-sub{font-size:14px;color:var(--stone);font-weight:300;}
.rp-cta-btn{font-size:11px;letter-spacing:4px;text-transform:uppercase;background:var(--bone);color:var(--black);padding:16px 36px;text-decoration:none;white-space:nowrap;transition:background .2s;}
.rp-cta-btn:hover{background:#fff;}

@media(max-width:768px){
  .rp-hero{padding:48px 24px 40px;}
  .rp-tabs-bar{padding:0 24px;}
  .rp-steps{padding:0 24px 60px;}
  .rp-step{grid-template-columns:1fr;gap:16px;}
  .rp-step-left{flex-direction:row;align-items:center;}
  .rp-step-num{font-size:52px;}
  .rp-cta{padding:40px 24px;}
  .rp-cta-inner{flex-direction:column;align-items:flex-start;}
}
`;

export default function RitualPage() {
  const [activeTab, setActiveTab] = useState('daily');

  const steps = activeTab === 'daily' ? DAILY_STEPS : WEEKLY_STEPS;
  const detail = activeTab === 'daily' ? DAILY_DETAIL : WEEKLY_DETAIL;
  const totalTime = activeTab === 'daily' ? '10 MIN' : '22 MIN';

  return (
    <>
      <style>{CSS}</style>
      <Nav />
      <div className="ritual-page">

        <div className="rp-hero">
          <div className="rp-eyebrow">The Ritual System</div>
          <div className="rp-title">How To Use SOLUM</div>
          <p className="rp-subtitle">Two rituals. One daily, one weekly. Everything you need to know to do them properly.</p>
        </div>

        <div className="rp-tabs-bar">
          <div className="rp-tabs-inner">
            <div className="rp-tabs">
              <button
                className={`rp-tab${activeTab === 'daily' ? ' active daily' : ''}`}
                onClick={() => setActiveTab('daily')}
              >
                Daily Ritual
              </button>
              <button
                className={`rp-tab${activeTab === 'weekly' ? ' active weekly' : ''}`}
                onClick={() => setActiveTab('weekly')}
              >
                Weekly Deep Ritual
              </button>
            </div>
            <div className={`rp-total ${activeTab}`}>{totalTime} · {steps.length} steps</div>
          </div>
        </div>

        <div className="rp-steps">
          {steps.map((step, i) => {
            const d = detail[step.num] || {};
            return (
              <div className="rp-step" key={i}>
                <div className="rp-step-left">
                  <div className={`rp-step-num ${activeTab}`}>{String(i + 1).padStart(2, '0')}</div>
                  <div className={`rp-step-badge ${activeTab}`}>Product {step.num}</div>
                </div>
                <div className="rp-step-right">
                  <div>
                    <div className="rp-step-header">
                      <div className="rp-step-name">{step.name}</div>
                    </div>
                    <div className="rp-step-meta">
                      <div className="rp-step-chip">{step.time}</div>
                      <div className="rp-step-chip">{step.zone}</div>
                    </div>
                  </div>
                  {d.how && (
                    <div>
                      <div className={`rp-step-how-label${activeTab === 'weekly' ? ' weekly' : ''}`}>How</div>
                      <div className="rp-step-how">{d.how}</div>
                    </div>
                  )}
                  {d.why && (
                    <div>
                      <div className="rp-step-why-label">Why it matters</div>
                      <div className="rp-step-why">{d.why}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="rp-cta">
          <div className="rp-cta-inner">
            <div className="rp-cta-copy">
              <div className="rp-cta-title">Ready to start?</div>
              <div className="rp-cta-sub">Everything you need is in one kit. Ships together.</div>
            </div>
            <a href="/#kits" className="rp-cta-btn">Choose Your Kit</a>
          </div>
        </div>

        <SolumFooter />
      </div>
    </>
  );
}
