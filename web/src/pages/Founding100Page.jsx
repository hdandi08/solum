// web/src/pages/Founding100Page.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY;

/* ─── CSS ─────────────────────────────────────────────────────────────────── */
const CSS = `
.f1-page{min-height:100vh;background:#08090B;font-family:'Barlow Condensed',sans-serif;color:#F0ECE2;-webkit-font-smoothing:antialiased;}

/* Nav */
.f1-nav{display:flex;align-items:center;justify-content:space-between;padding:24px 48px;border-bottom:1px solid rgba(240,236,226,0.06);}
.f1-nav-logo{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:.15em;color:#F0ECE2;text-decoration:none;}
.f1-nav-badge{font-size:10px;letter-spacing:4px;text-transform:uppercase;font-weight:700;color:#4A8FC7;border:1px solid rgba(74,143,199,0.4);padding:5px 12px;}
.f1-nav-right{display:flex;align-items:center;gap:20px;}
.f1-nav-meta{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:rgba(240,236,226,0.65);font-weight:600;}
.f1-nav-signout{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:rgba(240,236,226,0.55);background:none;border:none;cursor:pointer;padding:0;font-family:inherit;transition:color .2s;}
.f1-nav-signout:hover{color:#F0ECE2;}

/* Landing hero */
.f1-hero{padding:72px 48px 56px;text-align:center;border-bottom:1px solid rgba(240,236,226,0.06);}
.f1-eyebrow{font-size:11px;letter-spacing:6px;text-transform:uppercase;font-weight:700;color:#4A8FC7;margin-bottom:16px;}
.f1-hero-stat{font-family:'Bebas Neue',sans-serif;font-size:clamp(100px,18vw,200px);letter-spacing:-.02em;line-height:.85;color:#F0ECE2;margin-bottom:8px;}
.f1-hero-label{font-family:'Bebas Neue',sans-serif;font-size:clamp(22px,4vw,40px);letter-spacing:.12em;color:rgba(240,236,226,0.7);margin-bottom:24px;}
.f1-hero-line{font-size:16px;font-weight:300;color:rgba(240,236,226,0.75);letter-spacing:1px;max-width:480px;margin:0 auto;}

/* Reward cards */
.f1-rewards{display:grid;grid-template-columns:repeat(3,1fr);max-width:1200px;margin:0 auto;}
.f1-reward{padding:48px 40px;border-right:1px solid rgba(240,236,226,0.07);border-bottom:1px solid rgba(240,236,226,0.07);display:flex;flex-direction:column;}
.f1-reward:last-child{border-right:none;}
.f1-reward-tag{font-size:10px;letter-spacing:5px;text-transform:uppercase;font-weight:700;color:#4A8FC7;margin-bottom:24px;}
.f1-reward-visual{margin-bottom:28px;}
.f1-reward-big{font-family:'Bebas Neue',sans-serif;font-size:clamp(48px,6vw,72px);letter-spacing:.02em;line-height:.9;color:#F0ECE2;}
.f1-reward-big em{color:#4A8FC7;font-style:normal;}
.f1-reward-sub{font-size:13px;font-weight:300;color:rgba(240,236,226,0.7);margin-top:6px;letter-spacing:.5px;line-height:1.5;}
.f1-reward-body{font-size:15px;font-weight:300;color:rgba(240,236,226,0.8);line-height:1.6;flex:1;}
.f1-reward-body strong{color:#F0ECE2;font-weight:600;}

/* Price lock rows */
.f1-price-rows{display:flex;flex-direction:column;gap:8px;margin-bottom:28px;}
.f1-price-row{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border:1px solid rgba(240,236,226,0.07);background:rgba(240,236,226,0.02);}
.f1-price-name{font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:600;color:rgba(240,236,226,0.7);}
.f1-price-amount{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:.05em;color:#F0ECE2;}
.f1-price-lock{font-size:9px;letter-spacing:3px;text-transform:uppercase;font-weight:700;color:#4A8FC7;border:1px solid rgba(74,143,199,0.4);padding:3px 8px;}

/* Product chips */
.f1-product-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:28px;}
.f1-chip{font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:.1em;color:rgba(240,236,226,0.7);border:1px solid rgba(240,236,226,0.2);padding:6px 12px;}
.f1-chip-new{color:#4A8FC7;border-color:rgba(74,143,199,0.4);}

/* Commitment strip */
.f1-commitment{border-top:1px solid rgba(240,236,226,0.07);border-bottom:1px solid rgba(240,236,226,0.07);padding:28px 48px;display:flex;align-items:center;justify-content:center;gap:48px;flex-wrap:wrap;}
.f1-commitment-item{display:flex;align-items:center;gap:12px;}
.f1-commitment-icon{font-size:18px;opacity:.6;}
.f1-commitment-text{font-size:13px;font-weight:300;color:rgba(240,236,226,0.75);letter-spacing:.5px;line-height:1.4;}
.f1-commitment-text strong{color:#F0ECE2;font-weight:600;}

/* Login form */
.f1-login-wrap{max-width:480px;margin:0 auto;padding:0 48px 80px;}
.f1-login-title{font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:.06em;color:#F0ECE2;margin-bottom:8px;text-align:center;}
.f1-login-sub{font-size:14px;font-weight:300;color:rgba(240,236,226,0.75);margin-bottom:24px;text-align:center;line-height:1.5;}
.f1-input{width:100%;background:#181C24;border:1px solid rgba(240,236,226,0.15);color:#F0ECE2;padding:14px 16px;font-family:'Barlow Condensed',sans-serif;font-size:16px;outline:none;transition:border-color .2s;box-sizing:border-box;}
.f1-input:focus{border-color:#2E6DA4;}
.f1-btn{width:100%;background:#F0ECE2;color:#08090B;border:none;font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:.15em;padding:18px;cursor:pointer;transition:background .2s;margin-top:10px;}
.f1-btn:hover:not(:disabled){background:#fff;}
.f1-btn:disabled{background:rgba(240,236,226,0.25);color:rgba(8,9,11,0.4);cursor:wait;}
.f1-btn-ghost{width:100%;background:transparent;color:rgba(240,236,226,0.7);border:1px solid rgba(240,236,226,0.2);font-family:'Barlow Condensed',sans-serif;font-size:13px;letter-spacing:2px;text-transform:uppercase;padding:12px;cursor:pointer;margin-top:8px;transition:border-color .2s,color .2s;}
.f1-btn-ghost:hover{border-color:#F0ECE2;color:#F0ECE2;}
.f1-err{font-size:13px;color:#e05c5c;margin-top:10px;padding:10px 14px;border:1px solid rgba(224,92,92,0.25);background:rgba(224,92,92,0.04);}
.f1-not-member{font-size:14px;color:rgba(240,236,226,0.70);text-align:center;margin-top:20px;line-height:1.6;}
.f1-not-member a{color:#4A8FC7;text-decoration:none;}

/* Sent screen */
.f1-sent{max-width:480px;margin:80px auto;padding:0 48px;text-align:center;}
.f1-sent-icon{font-size:36px;margin-bottom:20px;display:block;}
.f1-sent-title{font-family:'Bebas Neue',sans-serif;font-size:36px;letter-spacing:.05em;margin-bottom:12px;}
.f1-sent-body{font-size:15px;font-weight:300;color:rgba(240,236,226,0.8);line-height:1.65;margin-bottom:28px;}

/* ── Pledge gate ── */
.f1-pledge-wrap{max-width:680px;margin:0 auto;padding:64px 48px 80px;}
.f1-pledge-eyebrow{font-size:11px;letter-spacing:6px;text-transform:uppercase;font-weight:700;color:#4A8FC7;margin-bottom:16px;}
.f1-pledge-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,5vw,56px);letter-spacing:.04em;line-height:1;margin-bottom:32px;}
.f1-pledge-block{border:1px solid rgba(240,236,226,0.1);padding:32px 36px;margin-bottom:32px;}
.f1-pledge-section-label{font-size:10px;letter-spacing:5px;text-transform:uppercase;font-weight:700;color:rgba(240,236,226,0.55);margin-bottom:16px;}
.f1-pledge-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:12px;}
.f1-pledge-item{display:flex;align-items:flex-start;gap:14px;font-size:15px;font-weight:300;color:rgba(240,236,226,0.85);line-height:1.55;}
.f1-pledge-item::before{content:'—';color:#4A8FC7;flex-shrink:0;margin-top:1px;}
.f1-pledge-item strong{color:#F0ECE2;font-weight:600;}
.f1-pledge-divider{border:none;border-top:1px solid rgba(240,236,226,0.07);margin:28px 0;}
.f1-pledge-exit{font-size:13px;font-weight:300;color:rgba(240,236,226,0.65);line-height:1.6;}
.f1-pledge-exit strong{color:rgba(240,236,226,0.85);font-weight:600;}
.f1-pledge-check-row{display:flex;align-items:flex-start;gap:14px;margin-bottom:24px;cursor:pointer;}
.f1-pledge-checkbox{width:18px;height:18px;border:1px solid rgba(240,236,226,0.35);background:transparent;flex-shrink:0;margin-top:2px;display:flex;align-items:center;justify-content:center;transition:border-color .2s,background .2s;}
.f1-pledge-checkbox.checked{background:#2E6DA4;border-color:#2E6DA4;}
.f1-pledge-check-label{font-size:15px;font-weight:400;color:rgba(240,236,226,0.9);line-height:1.5;}

/* ── Portal ── */
.f1-portal{max-width:800px;margin:0 auto;padding:48px 48px 80px;}

/* Welcome */
.f1-welcome{background:#181C24;border:1px solid rgba(74,143,199,0.2);padding:32px 36px;margin-bottom:24px;display:flex;align-items:flex-start;justify-content:space-between;gap:24px;}
.f1-welcome-name{font-family:'Bebas Neue',sans-serif;font-size:30px;letter-spacing:.06em;line-height:1;margin-bottom:4px;}
.f1-welcome-date{font-size:13px;font-weight:300;color:rgba(240,236,226,0.65);letter-spacing:.5px;}
.f1-status-pill{display:inline-block;font-size:10px;letter-spacing:4px;text-transform:uppercase;font-weight:700;padding:6px 14px;}
.f1-status-active{background:rgba(74,143,199,0.15);color:#4A8FC7;}
.f1-status-inactive{background:rgba(168,180,188,0.1);color:rgba(240,236,226,0.6);}

/* Participation */
.f1-participation{border:1px solid rgba(240,236,226,0.07);padding:20px 28px;margin-bottom:36px;display:flex;align-items:center;gap:32px;}
.f1-part-stat{}
.f1-part-label{font-size:10px;letter-spacing:4px;text-transform:uppercase;font-weight:600;color:rgba(240,236,226,0.55);margin-bottom:3px;}
.f1-part-value{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:.06em;color:#F0ECE2;}
.f1-part-bar-wrap{flex:1;}
.f1-part-track{height:2px;background:rgba(240,236,226,0.07);width:100%;}
.f1-part-fill{height:100%;background:#4A8FC7;transition:width .5s ease;}
.f1-part-note{font-size:12px;font-weight:300;color:rgba(240,236,226,0.60);margin-top:6px;letter-spacing:.3px;}

/* Section label */
.f1-section-label{font-size:10px;letter-spacing:6px;text-transform:uppercase;font-weight:700;color:rgba(240,236,226,0.50);margin-bottom:14px;}

/* Job card */
.f1-job{border:1px solid rgba(240,236,226,0.09);margin-bottom:12px;transition:border-color .2s;}
.f1-job.open{border-color:rgba(74,143,199,0.35);}
.f1-job.done{border-color:rgba(74,143,199,0.15);background:rgba(74,143,199,0.02);}
.f1-job-head{padding:22px 28px;display:flex;align-items:center;justify-content:space-between;gap:16px;cursor:pointer;user-select:none;}
.f1-job-tag{font-size:10px;letter-spacing:4px;text-transform:uppercase;font-weight:700;margin-bottom:4px;}
.f1-job-tag-open{color:#4A8FC7;}
.f1-job-tag-done{color:rgba(74,143,199,0.8);}
.f1-job-title{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:.05em;color:#F0ECE2;}
.f1-job-desc{font-size:13px;font-weight:300;color:rgba(240,236,226,0.72);margin-top:3px;line-height:1.5;}
.f1-job-chevron{font-size:16px;color:rgba(240,236,226,0.35);transition:transform .2s;flex-shrink:0;}
.f1-job.expanded .f1-job-chevron{transform:rotate(180deg);}

/* Job content */
.f1-job-content{padding:4px 28px 28px;border-top:1px solid rgba(240,236,226,0.05);}

/* Questions */
.f1-q{margin-top:24px;}
.f1-q-label{font-size:10px;letter-spacing:4px;text-transform:uppercase;font-weight:600;color:rgba(240,236,226,0.55);margin-bottom:8px;}
.f1-q-text{font-size:16px;font-weight:500;color:#F0ECE2;line-height:1.4;margin-bottom:12px;}

/* Checkboxes / radio */
.f1-options{display:flex;flex-direction:column;gap:8px;}
.f1-option{display:flex;align-items:center;gap:12px;cursor:pointer;padding:10px 14px;border:1px solid rgba(240,236,226,0.1);transition:border-color .15s,background .15s;}
.f1-option:hover{border-color:rgba(240,236,226,0.25);}
.f1-option.selected{border-color:rgba(74,143,199,0.5);background:rgba(74,143,199,0.06);}
.f1-option-box{width:16px;height:16px;border:1px solid rgba(240,236,226,0.35);flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:background .15s,border-color .15s;}
.f1-option.selected .f1-option-box{background:#2E6DA4;border-color:#2E6DA4;}
.f1-option-radio{border-radius:50%;}
.f1-option-label{font-size:14px;font-weight:400;color:rgba(240,236,226,0.88);}
.f1-other-input{width:100%;background:#08090B;border:1px solid rgba(240,236,226,0.15);color:#F0ECE2;padding:10px 14px;font-family:'Barlow Condensed',sans-serif;font-size:14px;outline:none;margin-top:8px;box-sizing:border-box;transition:border-color .2s;}
.f1-other-input:focus{border-color:#2E6DA4;}

/* Textarea */
.f1-textarea{width:100%;background:#181C24;border:1px solid rgba(240,236,226,0.12);color:#F0ECE2;padding:14px 16px;font-family:'Barlow Condensed',sans-serif;font-size:15px;font-weight:300;outline:none;resize:vertical;min-height:80px;line-height:1.5;box-sizing:border-box;transition:border-color .2s;}
.f1-textarea:focus{border-color:#2E6DA4;}

/* Submit row */
.f1-submit-row{display:flex;align-items:center;justify-content:space-between;margin-top:28px;gap:16px;flex-wrap:wrap;}
.f1-submit-note{font-size:13px;font-weight:300;color:rgba(240,236,226,0.65);flex:1;}
.f1-btn-submit{background:#2E6DA4;color:#F0ECE2;border:none;font-family:'Bebas Neue',sans-serif;font-size:17px;letter-spacing:.15em;padding:14px 32px;cursor:pointer;transition:background .2s;flex-shrink:0;}
.f1-btn-submit:hover:not(:disabled){background:#4A8FC7;}
.f1-btn-submit:disabled{background:rgba(46,109,164,0.35);cursor:wait;}

/* Done state */
.f1-done-note{display:flex;align-items:center;gap:10px;font-size:13px;font-weight:400;color:rgba(74,143,199,0.9);margin-top:20px;}
.f1-response-view{margin-top:4px;}
.f1-response-q{font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;color:rgba(240,236,226,0.55);margin-bottom:5px;margin-top:20px;}
.f1-response-a{font-size:14px;font-weight:300;color:rgba(240,236,226,0.80);line-height:1.55;padding-left:12px;border-left:2px solid rgba(74,143,199,0.3);}

/* The Record */
.f1-record{border:1px solid rgba(240,236,226,0.07);padding:32px 28px;margin-top:12px;}
.f1-record-title{font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:.06em;margin-bottom:8px;}
.f1-record-sub{font-size:14px;font-weight:300;color:rgba(240,236,226,0.75);line-height:1.6;margin-bottom:24px;}
.f1-record-empty{text-align:center;padding:28px 0;border-top:1px solid rgba(240,236,226,0.05);}
.f1-record-empty-text{font-size:13px;font-weight:300;color:rgba(240,236,226,0.60);line-height:1.7;}

/* Inactive */
.f1-inactive-gate{background:rgba(240,236,226,0.02);border:1px solid rgba(240,236,226,0.07);padding:40px 36px;text-align:center;margin-top:24px;}
.f1-inactive-title{font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:.05em;margin-bottom:10px;}
.f1-inactive-body{font-size:15px;font-weight:300;color:rgba(240,236,226,0.78);line-height:1.65;margin-bottom:24px;}

.f1-divider{border:none;border-top:1px solid rgba(240,236,226,0.05);margin:36px 0;}
.f1-loading{min-height:100vh;display:flex;align-items:center;justify-content:center;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:rgba(240,236,226,0.45);font-family:'Barlow Condensed',sans-serif;}
.f1-back{font-size:12px;letter-spacing:3px;text-transform:uppercase;color:rgba(240,236,226,0.55);text-decoration:none;display:inline-block;margin-top:20px;}
.f1-back:hover{color:rgba(240,236,226,0.9);}

@media(max-width:768px){
  .f1-nav{padding:20px 24px;}
  .f1-hero{padding:48px 24px 40px;}
  .f1-rewards{grid-template-columns:1fr;}
  .f1-reward{border-right:none;}
  .f1-commitment{padding:24px;gap:24px;}
  .f1-login-wrap{padding:0 24px 60px;}
  .f1-pledge-wrap{padding:40px 24px 60px;}
  .f1-portal{padding:32px 24px 60px;}
  .f1-welcome{flex-direction:column;gap:12px;}
  .f1-participation{flex-direction:column;gap:16px;}
  .f1-part-bar-wrap{width:100%;}
  .f1-submit-row{flex-direction:column;align-items:stretch;}
}
`;

/* ─── Utility ─────────────────────────────────────────────────────────────── */
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/* ─── Schema-driven question renderer ─────────────────────────────────────── */
function QuestionField({ q, value, onChange }) {
  // value shape: checkboxes/radio → { selected: string|string[], other: '' }
  //              text → string

  if (q.type === 'text') {
    return (
      <div className="f1-q">
        <div className="f1-q-label">{q.label.split('?')[0].substring(0, 30)}…</div>
        <div className="f1-q-text">{q.label}</div>
        <textarea
          className="f1-textarea"
          placeholder={q.placeholder ?? ''}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          rows={3}
        />
      </div>
    );
  }

  const isCheckboxes = q.type === 'checkboxes';
  const selected     = value?.selected ?? (isCheckboxes ? [] : '');
  const otherText    = value?.other ?? '';
  const otherChosen  = isCheckboxes ? selected.includes('Other') : selected === 'Other';

  function toggleCheckbox(opt) {
    const next = selected.includes(opt)
      ? selected.filter(s => s !== opt)
      : [...selected, opt];
    onChange({ selected: next, other: otherText });
  }

  function selectRadio(opt) {
    onChange({ selected: opt, other: opt === 'Other' ? otherText : '' });
  }

  const allOptions = q.other ? [...q.options, 'Other'] : q.options;

  return (
    <div className="f1-q">
      <div className="f1-q-label">
        {isCheckboxes ? 'Select all that apply' : 'Choose one'}
      </div>
      <div className="f1-q-text">{q.label}</div>
      <div className="f1-options">
        {allOptions.map(opt => {
          const isSelected = isCheckboxes ? selected.includes(opt) : selected === opt;
          return (
            <div
              key={opt}
              className={`f1-option${isSelected ? ' selected' : ''}`}
              onClick={() => isCheckboxes ? toggleCheckbox(opt) : selectRadio(opt)}
            >
              <div className={`f1-option-box${isCheckboxes ? '' : ' f1-option-radio'}`}>
                {isSelected && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="#F0ECE2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span className="f1-option-label">{opt}</span>
            </div>
          );
        })}
      </div>
      {otherChosen && (
        <input
          className="f1-other-input"
          placeholder="Tell us more…"
          value={otherText}
          onChange={e => onChange({ selected, other: e.target.value })}
        />
      )}
    </div>
  );
}

/* ─── Completed job view (shows their answers) ─────────────────────────────── */
function CompletedJobContent({ job, completion }) {
  function renderAnswer(q, val) {
    if (!val && val !== 0) return '—';
    if (q.type === 'text') return val || '—';
    if (q.type === 'checkboxes') {
      const parts = [...(val.selected ?? [])];
      if (val.other) parts.push(`Other: ${val.other}`);
      return parts.join(', ') || '—';
    }
    if (q.type === 'radio') {
      return val.selected === 'Other' && val.other
        ? `Other: ${val.other}`
        : val.selected || '—';
    }
    return '—';
  }

  return (
    <div className="f1-response-view">
      {job.schema.map(q => (
        <div key={q.id}>
          <div className="f1-response-q">{q.label}</div>
          <div className="f1-response-a">{renderAnswer(q, completion.responses[q.id])}</div>
        </div>
      ))}
      <div className="f1-done-note">
        ✓ Submitted {formatDate(completion.submitted_at)} · {completion.points_earned} pts
      </div>
    </div>
  );
}

/* ─── Job card ─────────────────────────────────────────────────────────────── */
function JobCard({ job, completion, session, onComplete }) {
  const isDone      = !!completion;
  const [open, setOpen] = useState(!isDone);
  const [answers, setAnswers] = useState({});
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState('');

  function validate() {
    for (const q of job.schema) {
      if (!q.required) continue;
      const v = answers[q.id];
      if (q.type === 'text' && !v?.trim()) return `Please answer: "${q.label}"`;
      if (q.type === 'radio' && !v?.selected) return `Please select an answer for: "${q.label}"`;
      if (q.type === 'checkboxes' && (!v?.selected?.length)) return `Please select at least one option for: "${q.label}"`;
    }
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErr = validate();
    if (validationErr) { setErr(validationErr); return; }
    setSaving(true);
    setErr('');
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-founding-job`, {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ job_id: job.id, responses: answers }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Could not save. Please try again.');
      }
      onComplete(job.id, answers);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  const cardCls = `f1-job ${isDone ? 'done' : 'open'} ${open ? 'expanded' : ''}`;

  return (
    <div className={cardCls}>
      <div className="f1-job-head" onClick={() => setOpen(o => !o)}>
        <div style={{ flex: 1 }}>
          <div className={`f1-job-tag ${isDone ? 'f1-job-tag-done' : 'f1-job-tag-open'}`}>
            {isDone ? `Completed · ${completion.points_earned} pts` : `Open · ${job.points} pts`}
          </div>
          <div className="f1-job-title">{job.title}</div>
          <div className="f1-job-desc">{job.description}</div>
        </div>
        <div className="f1-job-chevron">▾</div>
      </div>

      {open && (
        <div className="f1-job-content">
          {isDone ? (
            <CompletedJobContent job={job} completion={completion} />
          ) : (
            <form onSubmit={handleSubmit}>
              {job.schema.map(q => (
                <QuestionField
                  key={q.id}
                  q={q}
                  value={answers[q.id]}
                  onChange={v => setAnswers(a => ({ ...a, [q.id]: v }))}
                />
              ))}
              {err && <div className="f1-err" style={{ marginTop: 16 }}>{err}</div>}
              <div className="f1-submit-row">
                <div className="f1-submit-note">
                  Responses are private to SOLUM. We'll tell you what we did with them.
                </div>
                <button className="f1-btn-submit" type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Submit'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Pledge gate ──────────────────────────────────────────────────────────── */
function PledgeView({ session, member, onSigned }) {
  const [accepted, setAccepted] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState('');

  async function handleCommit() {
    if (!accepted) return;
    setSaving(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/sign-founding-pledge`, {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error('Could not record your commitment. Please try again.');
      onSigned();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="f1-page">
      <style>{CSS}</style>
      <nav className="f1-nav">
        <a href="/" className="f1-nav-logo">SOLUM</a>
        <div className="f1-nav-badge">Founding 100</div>
        <div />
      </nav>
      <div className="f1-pledge-wrap">
        <div className="f1-pledge-eyebrow">Before you enter</div>
        <div className="f1-pledge-title">
          This is a commitment,<br />not a membership.
        </div>

        <div className="f1-pledge-block">
          <div className="f1-pledge-section-label">You commit to</div>
          <ul className="f1-pledge-list">
            <li className="f1-pledge-item">
              Responding to at least <strong>3 of every 4 jobs SOLUM posts</strong> — roughly 5 minutes each, twice a month pre-launch, once a week after your kit arrives.
            </li>
            <li className="f1-pledge-item">
              Keeping <strong>product formulas, supplier details, and internal pricing confidential</strong>. You're building this with us — that knowledge is not for sharing.
            </li>
            <li className="f1-pledge-item">
              Maintaining an <strong>active SOLUM subscription</strong> once we launch. The founding member role requires skin in the game.
            </li>
            <li className="f1-pledge-item">
              Not publicly disparaging SOLUM or its founders. Disagree with us inside the portal — that's the whole point.
            </li>
          </ul>

          <div className="f1-pledge-divider" />

          <div className="f1-pledge-section-label">SOLUM commits to</div>
          <ul className="f1-pledge-list">
            <li className="f1-pledge-item">
              A share of the <strong>bySolum Limited founding member equity pool</strong>, divided equally across all 100 members. Vests at £500K ARR.
            </li>
            <li className="f1-pledge-item">
              <strong>First access</strong> to every product before public launch, for life.
            </li>
            <li className="f1-pledge-item">
              <strong>First access</strong> to every product before public launch.
            </li>
            <li className="f1-pledge-item">
              Your name on the <strong>bysolum.com founding wall</strong>, permanently.
            </li>
            <li className="f1-pledge-item">
              A log of every decision your input shaped — <strong>what changed, and why</strong>.
            </li>
          </ul>

          <div className="f1-pledge-divider" />

          <div className="f1-pledge-exit">
            Founding membership can be withdrawn if you miss 4 consecutive jobs,
            your subscription lapses, or confidentiality is breached.
            You'll receive <strong>30 days' notice</strong> except in cases of breach.
            If your spot is withdrawn, the next person on the waitlist is offered your place.
          </div>
        </div>

        <div
          className="f1-pledge-check-row"
          onClick={() => setAccepted(a => !a)}
        >
          <div className={`f1-pledge-checkbox ${accepted ? 'checked' : ''}`}>
            {accepted && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="#F0ECE2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <div className="f1-pledge-check-label">
            I have read this commitment and I accept it.
          </div>
        </div>

        {err && <div className="f1-err" style={{ marginBottom: 16 }}>{err}</div>}

        <button
          className="f1-btn"
          onClick={handleCommit}
          disabled={!accepted || saving}
        >
          {saving ? 'Recording commitment…' : 'I commit. Let me in.'}
        </button>
      </div>
    </div>
  );
}

/* ─── Portal ───────────────────────────────────────────────────────────────── */
function PortalView({ session, member, jobs, completions: initialCompletions, onSignOut }) {
  const [completions, setCompletions] = useState(
    Object.fromEntries(initialCompletions.map(c => [c.job_id, c]))
  );

  const totalJobs     = jobs.length;
  const completedCount = Object.keys(completions).length;
  const pct           = totalJobs > 0 ? Math.round((completedCount / totalJobs) * 100) : 0;
  const isActive      = member.is_active;

  function handleJobComplete(jobId, responses) {
    setCompletions(prev => ({
      ...prev,
      [jobId]: { job_id: jobId, responses, points_earned: jobs.find(j => j.id === jobId)?.points ?? 2, submitted_at: new Date().toISOString() },
    }));
  }

  return (
    <div className="f1-page">
      <style>{CSS}</style>

      <nav className="f1-nav">
        <a href="/" className="f1-nav-logo">SOLUM</a>
        <div className="f1-nav-badge">Founding 100</div>
        <div className="f1-nav-right">
          <span className="f1-nav-meta">
            {member.first_name ?? member.email.split('@')[0]}
          </span>
          <button className="f1-nav-signout" onClick={onSignOut}>Sign out</button>
        </div>
      </nav>

      <div className="f1-portal">

        {/* Welcome */}
        <div className="f1-welcome">
          <div>
            <div className="f1-welcome-name">
              {member.first_name
                ? `${member.first_name}${member.last_name ? ` ${member.last_name}` : ''}.`
                : 'Welcome.'}
            </div>
            <div className="f1-welcome-date">
              Founding member since {formatDate(member.founding_member_since)}
            </div>
          </div>
          <span className={`f1-status-pill ${isActive ? 'f1-status-active' : 'f1-status-inactive'}`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Participation */}
        <div className="f1-participation">
          <div className="f1-part-stat">
            <div className="f1-part-label">Jobs completed</div>
            <div className="f1-part-value">{completedCount} / {totalJobs}</div>
          </div>
          <div className="f1-part-bar-wrap">
            <div className="f1-part-track">
              <div className="f1-part-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="f1-part-note">
              Complete at least 75% of jobs to maintain founding status
            </div>
          </div>
        </div>

        {!isActive ? (
          <div className="f1-inactive-gate">
            <div className="f1-inactive-title">Your Spot Is Reserved.</div>
            <div className="f1-inactive-body">
              Founding member access requires an active SOLUM subscription.<br />
              Reactivate to unlock jobs and keep your equity allocation.
            </div>
            <a href="/checkout">
              <button className="f1-btn" style={{ width: 'auto', padding: '14px 40px' }}>
                Reactivate
              </button>
            </a>
          </div>
        ) : (
          <>
            <div className="f1-section-label">Your Jobs</div>

            {jobs.length === 0 ? (
              <div style={{ color: 'rgba(240,236,226,0.3)', fontSize: 14, fontWeight: 300, padding: '20px 0' }}>
                No jobs posted yet. Check back soon.
              </div>
            ) : (
              jobs.map(job => (
                <JobCard
                  key={job.id}
                  job={job}
                  completion={completions[job.id] ?? null}
                  session={session}
                  onComplete={handleJobComplete}
                />
              ))
            )}

            <hr className="f1-divider" />

            {/* The Record */}
            <div className="f1-record">
              <div className="f1-record-title">The Record</div>
              <div className="f1-record-sub">
                Every decision SOLUM makes using founding member input is logged here —
                what changed, why, and which job drove it.
              </div>
              <div className="f1-record-empty">
                <div className="f1-record-empty-text">
                  No entries yet.<br />
                  <span style={{ color: 'rgba(240,236,226,0.2)' }}>
                    The first will appear once job responses are reviewed.
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

/* ─── Landing / login ──────────────────────────────────────────────────────── */
function LandingView({ phase, setPhase }) {
  const [email,   setEmail]   = useState('');
  const [sending, setSending] = useState(false);
  const [error,   setError]   = useState('');

  async function handleSend(e) {
    e.preventDefault();
    setError('');
    setSending(true);
    const normEmail = email.trim().toLowerCase();
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/check-founding-member`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
        body:    JSON.stringify({ email: normEmail }),
      });
      const { is_member } = await res.json();
      if (!is_member) {
        setError("This email isn't on our founding member list. Join the waitlist below to apply.");
        setSending(false);
        return;
      }
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: normEmail,
        options: { emailRedirectTo: `${window.location.origin}/founding-100` },
      });
      if (otpErr) throw otpErr;
      setPhase('sent');
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  }

  if (phase === 'sent') {
    return (
      <div className="f1-page">
        <style>{CSS}</style>
        <nav className="f1-nav">
          <a href="/" className="f1-nav-logo">SOLUM</a>
          <div className="f1-nav-badge">Founding 100</div>
          <div />
        </nav>
        <div className="f1-sent">
          <span className="f1-sent-icon">✉</span>
          <div className="f1-sent-title">Check Your Email.</div>
          <div className="f1-sent-body">
            We sent a login link to{' '}
            <strong style={{ color: '#F0ECE2' }}>{email.trim().toLowerCase()}</strong>.<br />
            Click it to enter the portal. Expires in 1 hour.
          </div>
          <button className="f1-btn-ghost" onClick={() => setPhase('login')}>
            ← Wrong email? Go back
          </button>
          <a href="/" className="f1-back">← Back to home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="f1-page">
      <style>{CSS}</style>

      <nav className="f1-nav">
        <a href="/" className="f1-nav-logo">SOLUM</a>
        <div className="f1-nav-badge">Founding 100</div>
        <a href="/" className="f1-back" style={{ marginTop: 0 }}>← Home</a>
      </nav>

      {/* Hero — number-led, minimal text */}
      <div className="f1-hero">
        <div className="f1-eyebrow">By invitation only · One time only</div>
        <div className="f1-hero-stat">100</div>
        <div className="f1-hero-label">Founding Members</div>
        <div className="f1-hero-line">
          You don't just buy SOLUM. You build it — and you own part of it.
        </div>
      </div>

      {/* Three rewards — visual first */}
      <div className="f1-rewards">

        {/* Reward 1: Price Lock */}
        <div className="f1-reward">
          <div className="f1-reward-tag">Reward 01</div>
          <div className="f1-price-rows">
            <div className="f1-price-row">
              <span className="f1-price-name">Ground</span>
              <span className="f1-price-amount">£55</span>
              <span className="f1-price-lock">Locked</span>
            </div>
            <div className="f1-price-row">
              <span className="f1-price-name">Ritual</span>
              <span className="f1-price-amount">£85</span>
              <span className="f1-price-lock">Locked</span>
            </div>
            <div className="f1-price-row">
              <span className="f1-price-name">Sovereign</span>
              <span className="f1-price-amount">£130</span>
              <span className="f1-price-lock">Locked</span>
            </div>
          </div>
          <div className="f1-reward-body">
            You join at launch price. <strong>That price is yours forever.</strong>{' '}
            As SOLUM scales and prices rise, you stay exactly where you started.
          </div>
        </div>

        {/* Reward 2: Product Trials */}
        <div className="f1-reward">
          <div className="f1-reward-tag">Reward 02</div>
          <div className="f1-reward-visual">
            <div className="f1-reward-big">First.<br />Every time.</div>
          </div>
          <div className="f1-product-chips">
            {['01','02','03','04','05','06','07','08','09','10'].map(n => (
              <span key={n} className={`f1-chip ${parseInt(n) > 8 ? 'f1-chip-new' : ''}`}>{n}</span>
            ))}
          </div>
          <div className="f1-reward-body">
            Every new product SOLUM develops — you trial it before anyone else.{' '}
            <strong>Products 09 and 10 are yours first.</strong>{' '}
            You shape what ships.
          </div>
        </div>

        {/* Reward 3: Equity */}
        <div className="f1-reward">
          <div className="f1-reward-tag">Reward 03</div>
          <div className="f1-reward-visual">
            <div className="f1-reward-big"><em>1</em>/100</div>
            <div className="f1-reward-sub">share of the founding pool<br />bySolum Limited</div>
          </div>
          <div className="f1-reward-body">
            A real equity stake. Equal among all 100 members.{' '}
            <strong>Vests when SOLUM hits £500K ARR.</strong>{' '}
            Tied to participation — not just showing up.
          </div>
        </div>

      </div>

      {/* Commitment strip */}
      <div className="f1-commitment">
        <div className="f1-commitment-item">
          <span className="f1-commitment-icon">◎</span>
          <div className="f1-commitment-text"><strong>3 of 4 jobs per month.</strong> ~5 min each.</div>
        </div>
        <div className="f1-commitment-item">
          <span className="f1-commitment-icon">◎</span>
          <div className="f1-commitment-text"><strong>Active subscription</strong> required.</div>
        </div>
        <div className="f1-commitment-item">
          <span className="f1-commitment-icon">◎</span>
          <div className="f1-commitment-text">Miss 4 jobs → <strong>warning.</strong> Miss 8 → spot opens.</div>
        </div>
      </div>

      <div className="f1-login-wrap">
        <div className="f1-login-title">Enter the Portal</div>
        <div className="f1-login-sub">
          Already a founding member? Enter your email for a login link. No password needed.
        </div>
        <form onSubmit={handleSend}>
          <input
            className="f1-input"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          {error && <div className="f1-err">{error}</div>}
          <button className="f1-btn" type="submit" disabled={sending || !email}>
            {sending ? 'Checking…' : 'Send Login Link'}
          </button>
        </form>
        <div className="f1-not-member">
          Not a founding member yet?{' '}
          <a href="/#founding-members">Join the waitlist to apply ↗</a>
        </div>
      </div>
    </div>
  );
}

/* ─── Root ─────────────────────────────────────────────────────────────────── */
export default function Founding100Page() {
  const [phase,       setPhase]       = useState('loading');
  const [session,     setSession]     = useState(null);
  const [member,      setMember]      = useState(null);
  const [jobs,        setJobs]        = useState([]);
  const [completions, setCompletions] = useState([]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
      if (sess) {
        setSession(sess);
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          loadMember(sess);
        }
      } else {
        setSession(null);
        setMember(null);
        setPhase('login');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadMember(sess) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/get-founding-member`, {
        headers: { 'Authorization': `Bearer ${sess.access_token}` },
      });
      if (!res.ok) { setPhase('login'); return; }
      const data = await res.json();
      if (!data.member) { setPhase('login'); return; }
      setMember(data.member);
      setJobs(data.jobs ?? []);
      setCompletions(data.completions ?? []);
      setPhase(data.member.pledge_signed_at ? 'portal' : 'pledge');
    } catch {
      setPhase('login');
    }
  }

  function handlePledgeSigned() {
    setMember(m => ({ ...m, pledge_signed_at: new Date().toISOString() }));
    setPhase('portal');
  }

  function handleSignOut() {
    supabase.auth.signOut();
    setPhase('login');
  }

  if (phase === 'loading') {
    return (
      <div className="f1-page">
        <style>{CSS}</style>
        <div className="f1-loading">Loading…</div>
      </div>
    );
  }

  if (phase === 'pledge' && member) {
    return <PledgeView session={session} member={member} onSigned={handlePledgeSigned} />;
  }

  if (phase === 'portal' && member) {
    return (
      <PortalView
        session={session}
        member={member}
        jobs={jobs}
        completions={completions}
        onSignOut={handleSignOut}
      />
    );
  }

  return <LandingView phase={phase} setPhase={setPhase} />;
}
