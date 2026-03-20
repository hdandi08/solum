import { useState, useEffect, useRef } from 'react';
import { DAILY_STEPS, WEEKLY_STEPS } from '../data/rituals.js';

const CSS = `
.ritual-section{background:var(--char);border-top:1px solid var(--line);padding:80px 48px;}
.ritual-inner{max-width:1400px;margin:0 auto;}
.ritual-tabs{display:flex;gap:0;margin-bottom:48px;border-bottom:1px solid var(--lineb);}
.ritual-tab{font-size:13px;letter-spacing:4px;text-transform:uppercase;color:var(--stone);padding:12px 24px;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:color .2s,border-color .2s;background:none;border-top:none;border-left:none;border-right:none;}
.ritual-tab:hover{color:var(--bone);}
.ritual-tab.active.daily{color:var(--bone);border-bottom-color:var(--blue);}
.ritual-tab.active.weekly{color:#c8a96e;border-bottom-color:#c8a96e;}
.ritual-content{display:grid;grid-template-columns:400px 1fr;gap:80px;}
.ritual-eyebrow{font-size:11px;letter-spacing:6px;text-transform:uppercase;font-weight:600;margin-bottom:12px;}
.ritual-eyebrow.daily{color:var(--blue);}
.ritual-eyebrow.weekly{color:#c8a96e;}
.ritual-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,4vw,56px);letter-spacing:.06em;color:var(--bone);line-height:1.05;margin-bottom:12px;}
.ritual-subtitle{font-size:15px;color:var(--stone);font-weight:300;margin-bottom:32px;line-height:1.6;}
.ritual-steps{display:flex;flex-direction:column;gap:0;}
.ritual-step{display:grid;grid-template-columns:52px 1fr;gap:20px;padding:20px 0;border-bottom:1px solid var(--line);opacity:.5;transition:opacity .3s;cursor:pointer;}
.ritual-step.active{opacity:1;}
.ritual-step:hover{opacity:1;}
.step-num{font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:.05em;line-height:1;padding-top:2px;}
.step-num.daily{color:var(--blue);}
.step-num.weekly{color:#c8a96e;}
.step-info{display:flex;flex-direction:column;gap:4px;}
.step-title{font-size:14px;letter-spacing:2px;text-transform:uppercase;color:var(--bone);font-weight:600;}
.step-time{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);}
.step-desc{font-size:14px;color:var(--mist);font-weight:300;line-height:1.55;margin-top:4px;}
.step-warning{font-size:12px;color:#c8a96e;letter-spacing:1px;margin-top:4px;font-style:italic;}
.ritual-visual{position:relative;display:flex;align-items:center;justify-content:center;}
.ritual-canvas{width:100%;aspect-ratio:1;background:var(--dark);border:1px solid var(--lineb);position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;}
.ritual-canvas.daily::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,rgba(46,109,164,0.1),transparent 60%);}
.ritual-canvas.weekly::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,rgba(200,169,110,0.08),transparent 60%);}
.ritual-big-num{font-family:'Bebas Neue',sans-serif;font-size:220px;line-height:1;letter-spacing:-6px;color:transparent;user-select:none;pointer-events:none;position:absolute;}
.ritual-big-num.daily{-webkit-text-stroke:1px rgba(46,109,164,0.12);}
.ritual-big-num.weekly{-webkit-text-stroke:1px rgba(200,169,110,0.12);}
.ritual-step-name{position:absolute;bottom:32px;left:0;right:0;text-align:center;font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:.15em;color:rgba(240,236,226,.7);}
.ritual-timer{position:absolute;top:24px;right:28px;font-size:11px;letter-spacing:4px;text-transform:uppercase;}
.ritual-timer.daily{color:var(--blue);}
.ritual-timer.weekly{color:#c8a96e;}
.ritual-zone{position:absolute;top:24px;left:28px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);}
@media(max-width:768px){.ritual-content{grid-template-columns:1fr;}.ritual-visual{display:none;}.ritual-section{padding:60px 24px;}}
`;

export default function RitualSection() {
  const [activeTab, setActiveTab] = useState('daily');
  const [activeStep, setActiveStep] = useState(0);
  const timerRef = useRef(null);

  const steps = activeTab === 'daily' ? DAILY_STEPS : WEEKLY_STEPS;

  useEffect(() => {
    setActiveStep(0);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveStep(s => (s + 1) % steps.length);
    }, 3200);
    return () => clearInterval(timerRef.current);
  }, [activeTab]); // steps is fully determined by activeTab

  const handleStepClick = (i) => {
    clearInterval(timerRef.current);
    setActiveStep(i);
    timerRef.current = setInterval(() => {
      setActiveStep(s => (s + 1) % steps.length);
    }, 3200);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const step = steps[activeStep];

  return (
    <>
      <style>{CSS}</style>
      <section className="ritual-section" id="ritual">
        <div className="ritual-inner">
          <div className="ritual-tabs">
            <button
              className={`ritual-tab${activeTab === 'daily' ? ' active daily' : ''}`}
              onClick={() => handleTabChange('daily')}
            >
              Daily · 10 Min
            </button>
            <button
              className={`ritual-tab${activeTab === 'weekly' ? ' active weekly' : ''}`}
              onClick={() => handleTabChange('weekly')}
            >
              Weekly · 18 Min
            </button>
          </div>

          <div className="ritual-content">
            <div className="reveal-left">
              <div className={`ritual-eyebrow ${activeTab}`}>The Ritual</div>
              {activeTab === 'daily' ? (
                <>
                  <div className="ritual-title">10 Minutes.<br />Every Shower.</div>
                  <p className="ritual-subtitle">All five steps happen in the shower you're already taking. Follow the numbers.</p>
                </>
              ) : (
                <>
                  <div className="ritual-title">18 Minutes.<br />Every Week.</div>
                  <p className="ritual-subtitle">Replace your daily ritual once a week. Goes deeper. Covers everything the daily doesn't.</p>
                </>
              )}
              <div className="ritual-steps">
                {steps.map((s, i) => (
                  <div
                    key={i}
                    className={`ritual-step${activeStep === i ? ' active' : ''}`}
                    onClick={() => handleStepClick(i)}
                  >
                    <div className={`step-num ${activeTab}`}>{s.num}</div>
                    <div className="step-info">
                      <div className="step-title">{s.name}</div>
                      <div className="step-time">{s.time} · {s.zone}</div>
                      <div className="step-desc">{s.desc}</div>
                      {s.num === '02' && (
                        <div className="step-warning">Weekend use only — viscose rayon is too aggressive for daily use.</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ritual-visual reveal">
              <div className={`ritual-canvas ${activeTab}`}>
                <div className={`ritual-big-num ${activeTab}`}>{step.num}</div>
                <div className="ritual-zone">{step.zone}</div>
                <div className="ritual-step-name">{step.name}</div>
                <div className={`ritual-timer ${activeTab}`}>{step.time}</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
