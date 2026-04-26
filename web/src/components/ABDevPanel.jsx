import { useState, useEffect } from 'react';
import { AB_TESTS } from '../data/abtests';

const STORAGE_KEY = 'solum_ab_assignments';

function isLocalhost() {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

function getAssignments() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

function setVariant(testId, variant) {
  const a = getAssignments();
  a[testId] = variant;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(a));
}

const CSS = `
.abdev{position:fixed;bottom:20px;left:20px;z-index:9999;font-family:'Barlow Condensed',sans-serif;}
.abdev-toggle{background:#1A4A78;color:#F0ECE2;border:none;font-family:'Bebas Neue',sans-serif;font-size:13px;letter-spacing:.1em;padding:8px 14px;cursor:pointer;display:flex;align-items:center;gap:8px;}
.abdev-toggle:hover{background:#2E6DA4;}
.abdev-dot{width:6px;height:6px;border-radius:50%;background:#4A8FC7;}
.abdev-panel{background:#08090B;border:1px solid rgba(46,109,164,0.4);padding:16px;min-width:260px;margin-bottom:4px;}
.abdev-head{font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#4A8FC7;font-weight:600;margin-bottom:14px;}
.abdev-test{margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid rgba(255,255,255,0.06);}
.abdev-test:last-child{margin-bottom:0;padding-bottom:0;border-bottom:none;}
.abdev-name{font-size:12px;font-weight:600;color:#F0ECE2;letter-spacing:1px;margin-bottom:8px;}
.abdev-btns{display:flex;gap:6px;flex-wrap:wrap;}
.abdev-btn{font-size:11px;letter-spacing:2px;text-transform:uppercase;padding:5px 10px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:#6B6860;cursor:pointer;transition:all .15s;font-family:'Barlow Condensed',sans-serif;}
.abdev-btn:hover{border-color:#2E6DA4;color:#F0ECE2;}
.abdev-btn.active{background:#2E6DA4;border-color:#2E6DA4;color:#F0ECE2;}
.abdev-refresh{margin-top:12px;width:100%;font-size:10px;letter-spacing:3px;text-transform:uppercase;padding:7px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:#6B6860;cursor:pointer;font-family:'Barlow Condensed',sans-serif;}
.abdev-refresh:hover{color:#F0ECE2;border-color:rgba(255,255,255,0.3);}
`;

export default function ABDevPanel() {
  const [open, setOpen] = useState(false);
  const [assignments, setAssignments] = useState({});

  useEffect(() => {
    setAssignments(getAssignments());
  }, [open]);

  if (!isLocalhost()) return null;

  const activeTests = Object.entries(AB_TESTS).filter(([, t]) => t.status === 'active');

  function pick(testId, variant) {
    setVariant(testId, variant);
    setAssignments({ ...getAssignments(), [testId]: variant });
    window.location.reload();
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="abdev">
        {open && (
          <div className="abdev-panel">
            <div className="abdev-head">A/B Tests — Dev</div>
            {activeTests.length === 0 && (
              <div style={{ fontSize: 13, color: '#6B6860' }}>No active tests.</div>
            )}
            {activeTests.map(([id, test]) => (
              <div key={id} className="abdev-test">
                <div className="abdev-name">{test.name}</div>
                <div className="abdev-btns">
                  {test.variants.map(v => (
                    <button
                      key={v}
                      className={`abdev-btn${assignments[id] === v ? ' active' : ''}`}
                      onClick={() => pick(id, v)}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button className="abdev-refresh" onClick={reset}>Reset all assignments</button>
          </div>
        )}
        <button className="abdev-toggle" onClick={() => setOpen(o => !o)}>
          <span className="abdev-dot" />
          A/B {open ? '▾' : '▸'}
        </button>
      </div>
    </>
  );
}
