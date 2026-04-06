const CSS = `
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
@media(max-width:768px){.rp-tabs-bar{padding:0 24px;}}
`;

const TABS = [
  { id: 'daily',  label: 'Daily Ritual' },
  { id: 'weekly', label: 'Weekly Deep Ritual' },
];

export default function RitualTabBar({ activeTab, onTabChange, stepCount, totalTime }) {
  return (
    <>
      <style>{CSS}</style>
      <div className="rp-tabs-bar">
        <div className="rp-tabs-inner">
          <div className="rp-tabs">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                className={`rp-tab${activeTab === id ? ` active ${id}` : ''}`}
                onClick={() => onTabChange(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className={`rp-total ${activeTab}`}>{totalTime} · {stepCount} steps</div>
        </div>
      </div>
    </>
  );
}
