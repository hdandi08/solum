import { useState } from 'react';
import Nav from '../components/Nav';
import SolumFooter from '../components/SolumFooter';
import RitualChooser from '../components/ritual/RitualChooser';
import RitualDailyGuide from '../components/ritual/RitualDailyGuide';
import RitualStepList from '../components/ritual/RitualStepList';
import RitualShopCTA from '../components/ritual/RitualShopCTA';
import { DAILY_STEPS, WEEKLY_STEPS } from '../data/rituals.js';
import { DAILY_DETAILS, WEEKLY_DETAILS } from '../data/ritualDetails.js';

const CONFIG = {
  daily:  { steps: DAILY_STEPS,  details: DAILY_DETAILS,  totalTime: '10 MIN', stepCount: 3, label: 'DAILY RITUAL',  color: 'var(--blue)' },
  weekly: { steps: WEEKLY_STEPS, details: WEEKLY_DETAILS, totalTime: '22 MIN', stepCount: 4, label: 'WEEKLY RITUAL', color: '#c8a96e'     },
};

const CSS = `
.ritual-page { background: var(--black); min-height: 100vh; padding-top: 64px; }

.ritual-bar {
  border-bottom: 1px solid var(--line);
  background: var(--char);
  padding: 0 48px;
  position: sticky; top: 64px; z-index: 10;
}
.ritual-bar-inner {
  max-width: 1400px; margin: 0 auto;
  display: flex; align-items: center; gap: 20px;
  height: 52px;
}
.ritual-back {
  font-size: 11px; letter-spacing: 3px; text-transform: uppercase;
  color: var(--stone); background: none; border: none; cursor: pointer;
  padding: 0; transition: color .2s; white-space: nowrap; flex-shrink: 0;
}
.ritual-back:hover { color: var(--bone); }
.ritual-bar-divider { width: 1px; height: 18px; background: var(--line); flex-shrink: 0; }
.ritual-bar-label {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 18px; letter-spacing: .08em;
}
.ritual-bar-meta {
  font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
  color: var(--stone);
}

@media(max-width: 768px) {
  .ritual-bar { padding: 0 20px; }
  .ritual-bar-meta { display: none; }
}
`;

export default function RitualPage() {
  const [selected, setSelected] = useState(null);
  const config = selected ? CONFIG[selected] : null;

  return (
    <>
      <style>{CSS}</style>
      <Nav />
      <div className="ritual-page">
        {!selected ? (
          <RitualChooser onSelect={setSelected} />
        ) : (
          <>
            <div className="ritual-bar">
              <div className="ritual-bar-inner">
                <button className="ritual-back" onClick={() => setSelected(null)}>← Switch</button>
                <div className="ritual-bar-divider" />
                <span className="ritual-bar-label" style={{ color: config.color }}>{config.label}</span>
                <span className="ritual-bar-meta">· {config.totalTime} · {config.stepCount} STEPS</span>
              </div>
            </div>
            {selected === 'daily'
              ? <RitualDailyGuide />
              : <RitualStepList steps={config.steps} details={config.details} variant={selected} />
            }
            <RitualShopCTA />
          </>
        )}
        <SolumFooter />
      </div>
    </>
  );
}
