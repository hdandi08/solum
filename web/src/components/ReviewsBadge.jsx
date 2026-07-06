import { useState, useEffect } from 'react';
import { REVIEWS } from '../data/reviews.js';
import { capture } from '../lib/analytics.js';

// Compact star rating for the buy page. Full reviews open in a modal on click —
// nobody scrolls past the checkout form to a reviews section, so we surface the
// score up top and let intent-driven shoppers expand it.
const CSS = `
.rb-badge{display:inline-flex;align-items:center;gap:9px;background:none;border:none;padding:6px 0;cursor:pointer;font-family:'Barlow Condensed',sans-serif;}
.rb-stars{color:var(--blit);font-size:16px;letter-spacing:2px;line-height:1;}
.rb-score{color:var(--bone);font-size:15px;font-weight:700;letter-spacing:.5px;}
.rb-label{color:var(--stone);font-size:13px;font-weight:500;letter-spacing:.4px;text-decoration:underline;text-underline-offset:3px;}
.rb-badge:hover .rb-label{color:var(--bone);}

.rb-overlay{position:fixed;inset:0;z-index:3000;background:rgba(8,9,11,0.82);display:flex;align-items:center;justify-content:center;padding:20px;}
.rb-modal{background:var(--char);border:1px solid var(--lineb);max-width:560px;width:100%;max-height:85vh;display:flex;flex-direction:column;}
.rb-modal-head{display:flex;align-items:flex-start;justify-content:space-between;padding:22px 24px;border-bottom:1px solid var(--line);flex-shrink:0;}
.rb-modal-title{font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:.05em;color:var(--bone);line-height:1.05;}
.rb-modal-stars{color:var(--blit);font-size:15px;letter-spacing:2px;margin-top:4px;}
.rb-close{background:none;border:none;color:var(--stone);font-size:22px;cursor:pointer;line-height:1;padding:2px 4px;flex-shrink:0;}
.rb-close:hover{color:var(--bone);}
.rb-list{overflow-y:auto;padding:4px 24px 20px;}
.rb-item{padding:20px 0;border-bottom:1px solid var(--line);}
.rb-item:last-child{border-bottom:none;}
.rb-item-stars{color:var(--blit);font-size:13px;letter-spacing:2px;margin-bottom:9px;}
.rb-item-head{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:18px;color:var(--bone);line-height:1.25;margin-bottom:8px;}
.rb-item-body{font-size:14px;font-weight:300;color:var(--mist);line-height:1.6;margin-bottom:10px;}
.rb-item-author{font-size:13px;color:var(--stone);}
.rb-item-author b{color:var(--bone);font-weight:600;}
`;

export default function ReviewsBadge() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open]);

  return (
    <>
      <style>{CSS}</style>
      <button
        type="button"
        className="rb-badge"
        onClick={() => { capture('buy_reviews_opened'); setOpen(true); }}
      >
        <span className="rb-stars" aria-hidden="true">★★★★★</span>
        <span className="rb-score">5/5</span>
        <span className="rb-label">Read reviews ›</span>
      </button>

      {open && (
        <div className="rb-overlay" onClick={() => setOpen(false)}>
          <div className="rb-modal" role="dialog" aria-modal="true" aria-label="Customer reviews" onClick={(e) => e.stopPropagation()}>
            <div className="rb-modal-head">
              <div>
                <div className="rb-modal-title">Rated 5/5 by our first users</div>
                <div className="rb-modal-stars" aria-hidden="true">★★★★★</div>
              </div>
              <button type="button" className="rb-close" onClick={() => setOpen(false)} aria-label="Close reviews">✕</button>
            </div>
            <div className="rb-list">
              {REVIEWS.map(r => (
                <div key={r.id} className="rb-item">
                  <div className="rb-item-stars" aria-hidden="true">{'★'.repeat(r.rating)}</div>
                  <div className="rb-item-head">{r.headline}</div>
                  <div className="rb-item-body">{r.body}</div>
                  <div className="rb-item-author"><b>{r.name}</b> · {r.descriptor}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
