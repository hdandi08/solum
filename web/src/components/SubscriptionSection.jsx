import { useState, useRef } from 'react';
import { BANNER_FULL } from '../data/productMedia.js';
import { capture } from '../lib/analytics';
import { markUnboxingProgress } from '../lib/qualifiedVisitTracker';

const CSS = `
.sub-section{background:var(--black);padding:100px 48px;border-top:1px solid var(--line);}
.sub-inner{max-width:1400px;margin:0 auto;}
.unbox-band{margin-bottom:80px;}
.unbox-eyebrow{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:14px;text-align:center;}
.unbox-head{font-family:'Bebas Neue',sans-serif;font-size:clamp(32px,5vw,56px);letter-spacing:.05em;color:var(--bone);line-height:1;text-align:center;margin-bottom:36px;}
.unbox-grid{display:grid;grid-template-columns:1.4fr 1fr;gap:16px;}
.unbox-main{position:relative;overflow:hidden;background:#000;border:1px solid var(--line);}
.unbox-main img,.unbox-main video{width:100%;height:100%;object-fit:cover;display:block;}
.unbox-side{display:flex;flex-direction:column;gap:16px;}
.unbox-side-shot{overflow:hidden;border:1px solid var(--line);flex:1;}
.unbox-side-shot img{width:100%;height:100%;object-fit:cover;display:block;}
.unbox-play{position:absolute;inset:0;width:100%;height:100%;border:none;padding:0;cursor:pointer;background:none;display:block;}
.unbox-scrim{position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,rgba(8,9,11,0.6),rgba(8,9,11,0) 42%),linear-gradient(to top,rgba(8,9,11,0.55),rgba(8,9,11,0) 45%,rgba(8,9,11,0) 70%,rgba(8,9,11,0.4));}
.unbox-watch{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:12px;}
.unbox-play-ring{position:relative;width:76px;height:76px;border-radius:50%;background:rgba(46,109,164,0.72);border:2px solid var(--bone);box-shadow:0 4px 24px rgba(8,9,11,0.6),0 0 0 6px rgba(74,143,199,0.18);display:flex;align-items:center;justify-content:center;color:var(--bone);backdrop-filter:blur(3px);transition:transform .2s,background .2s,border-color .2s;}
.unbox-play-ring::after{content:'';position:absolute;inset:-2px;border-radius:50%;border:2px solid rgba(74,143,199,0.6);animation:unboxpulse 2s ease-out infinite;}
@keyframes unboxpulse{0%{transform:scale(1);opacity:.7;}100%{transform:scale(1.5);opacity:0;}}
@media(prefers-reduced-motion:reduce){.unbox-play-ring::after{animation:none;}}
.unbox-play:hover .unbox-play-ring{transform:scale(1.08);background:var(--blit);border-color:var(--blit);}
.unbox-watch-label{font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:.1em;color:var(--bone);text-transform:uppercase;text-shadow:0 1px 8px rgba(8,9,11,0.8);}
.unbox-dur{position:absolute;bottom:12px;right:12px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--bone);font-weight:600;background:rgba(8,9,11,0.5);padding:4px 8px;}
.unbox-caption{font-size:13px;color:var(--stone);font-weight:300;text-align:center;margin-top:16px;max-width:560px;margin-left:auto;margin-right:auto;line-height:1.6;}
@media(max-width:768px){.unbox-grid{grid-template-columns:1fr;}.unbox-side{flex-direction:row;}}
.sub-header{margin-bottom:64px;}
.sub-header .s-sec-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:#c8a96e;font-weight:600;margin-bottom:16px;}
.sub-header h2{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,4vw,64px);letter-spacing:.06em;color:var(--bone);line-height:1.05;margin-bottom:16px;}
.sub-header p{font-size:17px;color:var(--mist);font-weight:300;line-height:1.7;max-width:560px;}
.sub-coming-badge{display:inline-block;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#c8a96e;border:1px solid rgba(200,169,110,0.35);padding:5px 12px;margin-bottom:20px;font-weight:700;}
.sub-early-access{margin-top:24px;border:1px solid rgba(200,169,110,0.25);background:rgba(200,169,110,0.04);padding:24px;}
.sub-early-access-label{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#c8a96e;font-weight:600;margin-bottom:8px;}
.sub-early-access-body{font-size:14px;color:var(--stone);font-weight:300;line-height:1.6;margin-bottom:16px;}
.sub-ea-form{display:flex;gap:0;flex-direction:column;}
.sub-ea-input{background:var(--dark);border:1px solid var(--lineb);border-bottom:none;color:var(--bone);padding:13px 16px;font-family:'Barlow Condensed',sans-serif;font-size:15px;outline:none;transition:border-color .2s;box-sizing:border-box;}
.sub-ea-input:focus{border-color:rgba(200,169,110,0.5);}
.sub-ea-input::placeholder{color:rgba(168,180,188,0.4);}
.sub-ea-btn{background:#c8a96e;color:#08090b;border:none;font-family:'Bebas Neue',sans-serif;font-size:15px;letter-spacing:.12em;padding:14px 20px;cursor:pointer;transition:background .2s;}
.sub-ea-btn:hover:not(:disabled){background:#d9bc88;}
.sub-ea-btn:disabled{opacity:.6;cursor:default;}
.sub-ea-success{font-size:14px;color:#c8a96e;font-weight:500;padding:14px 0;}
.sub-grid{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:start;}
.cadence-list{display:flex;flex-direction:column;gap:1px;background:var(--line);}
.cadence-item{background:var(--char);padding:32px 36px;}
.cadence-label{font-size:11px;letter-spacing:5px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:8px;}
.cadence-products{font-size:16px;color:var(--bone);font-weight:500;margin-bottom:8px;line-height:1.4;}
.cadence-note{font-size:13px;color:var(--stone);font-weight:300;margin-bottom:6px;}
.cadence-copy{font-size:15px;color:var(--mist);font-weight:300;line-height:1.6;}
.pricing-panel{display:flex;flex-direction:column;gap:0;}
.pricing-panel-title{font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:.06em;color:var(--bone);margin-bottom:24px;}
.price-rows{display:flex;flex-direction:column;gap:1px;background:var(--line);margin-bottom:32px;}
.price-row-item{background:var(--char);padding:24px 28px;display:flex;justify-content:space-between;align-items:center;}
.price-row-item.coming .price-row-kit,.price-row-item.coming .price-row-amount{opacity:0.5;}
.price-row-kit{font-size:13px;letter-spacing:4px;text-transform:uppercase;color:var(--stone);font-weight:600;}
.price-row-amount{font-family:'Bebas Neue',sans-serif;font-size:36px;color:var(--bone);letter-spacing:-.5px;}
.price-row-note{font-size:12px;color:var(--stone);font-weight:300;margin-top:2px;text-align:right;}
.sub-footnote{font-size:15px;color:var(--stone);font-weight:300;line-height:1.7;border-left:2px solid var(--blue);padding-left:20px;}
@media(max-width:768px){.sub-grid{grid-template-columns:1fr;gap:48px;}.sub-section{padding:60px 24px;}}
`;

const CADENCE = [
  {
    label: 'Every Month',
    products: 'Body Wash · Body Lotion · Cleansing Cloth · Atlas Clay',
    note: '+ Argan Body Oil (RITUAL only)',
    copy: 'Everything that depletes or wears within a month. Always fresh, always ready.',
  },
  {
    label: 'Every 2 Months',
    products: 'Italy Towel Mitt',
    note: null,
    copy: 'The exfoliating mitt holds onto bacteria over time. Swapped before it stops being hygienic.',
  },
  {
    label: 'Every 3 Months',
    products: 'Back Scrub Cloth',
    note: null,
    copy: 'The back cloth takes more friction than anything else. Replaced before it loses effectiveness.',
  },
  {
    label: 'Every 6 Months',
    products: 'Scalp Massager',
    note: null,
    copy: 'Silicone nubs wear down. A fresh one ships automatically.',
  },
];


const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

const PLAY_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 3 }}>
    <path d="M8 5v14l11-7z" />
  </svg>
);

export default function SubscriptionSection() {
  const [email, setEmail] = useState('');
  const [eaState, setEaState] = useState('idle'); // idle | submitting | done | error
  const [filmPlaying, setFilmPlaying] = useState(false);
  const filmRef = useRef(null);
  const progressFired = useRef(new Set());

  function onTimeUpdate() {
    const v = filmRef.current;
    if (!v || !v.duration) return;
    const pct = (v.currentTime / v.duration) * 100;
    for (const m of [25, 50, 75, 100]) {
      if (pct >= m && !progressFired.current.has(m)) {
        progressFired.current.add(m);
        capture('unboxing_video_progress', { percent: m, source: 'unboxing' });
        markUnboxingProgress(m);
      }
    }
  }

  function playFilm() {
    const v = filmRef.current;
    if (!v) return;
    v.play();
    setFilmPlaying(true);
  }

  async function handleEarlyAccess(e) {
    e.preventDefault();
    if (!email || eaState !== 'idle') return;
    setEaState('submitting');
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/join-waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON },
        body: JSON.stringify({ email, source: 'subscription-section' }),
      });
      if (!res.ok) throw new Error();
      setEaState('done');
    } catch {
      setEaState('error');
    }
  }

  return (
    <>
      <style>{CSS}</style>
      <section className="sub-section" id="subscription">
        <div className="sub-inner">
          <div className="unbox-band reveal">
            <div className="unbox-eyebrow">The Unboxing</div>
            <h2 className="unbox-head">Head to toe.<br />Cared for.</h2>
            <div className="unbox-grid">
              <div className="unbox-main">
                {BANNER_FULL.ready ? (
                  <>
                    <video
                      ref={filmRef}
                      poster="/products/kit/still.webp"
                      controls={filmPlaying}
                      preload="metadata"
                      playsInline
                      onEnded={() => setFilmPlaying(false)}
                      onTimeUpdate={onTimeUpdate}
                    >
                      {/* click-to-play film — plays with sound (user-initiated). mp4 carries the audio. */}
                      <source src={BANNER_FULL.mp4} type="video/mp4" />
                    </video>
                    {!filmPlaying && (
                      <button className="unbox-play" onClick={playFilm} aria-label="Watch the SOLUM kit film">
                        <span className="unbox-scrim" />
                        <span className="unbox-watch">
                          <span className="unbox-play-ring">{PLAY_ICON}</span>
                          <span className="unbox-watch-label">Watch the film</span>
                        </span>
                        <span className="unbox-dur">71s</span>
                      </button>
                    )}
                  </>
                ) : (
                  <img
                    src="/products/kit/still.webp"
                    width={1200}
                    height={1500}
                    loading="lazy"
                    alt="SOLUM kit flatlay — body wash, lotion, scalp massager, exfoliating mitt and back scrub cloth arranged on a dark surface"
                  />
                )}
              </div>
              <div className="unbox-side">
                <div className="unbox-side-shot">
                  <img
                    src="/products/kit/use-1.webp"
                    width={1200}
                    height={1500}
                    loading="lazy"
                    alt="SOLUM kit products laid out showing the daily ritual tools"
                  />
                </div>
                <div className="unbox-side-shot">
                  <img
                    src="/products/kit/use-2.webp"
                    width={1200}
                    height={1500}
                    loading="lazy"
                    alt="Close-up of SOLUM kit packaging and product detail"
                  />
                </div>
              </div>
            </div>
            <p className="unbox-caption">Every kit ships as one system — wash, tools, and lotion together. Nothing to figure out, nothing missing.</p>
          </div>

          <div className="sub-header reveal">
            <div className="s-sec-tag">Coming Soon</div>
            <h2>Subscription.<br />On Autopilot.</h2>
            <p>
              We are launching as a one-time purchase. Subscription is coming. Join the early access list to be first.
            </p>
          </div>
          <div className="sub-grid">
            <div className="reveal">
              <div className="sub-coming-badge">Coming Soon</div>
              <p style={{ fontSize: '15px', color: 'var(--stone)', fontWeight: 300, lineHeight: 1.7, marginBottom: '20px' }}>
                This is how the subscription will work. Pay once for your kit. After that, only what you've run out of arrives at your door. One flat monthly price, no matter what ships.
              </p>
              <div className="cadence-list">
                {CADENCE.map(c => (
                  <div key={c.label} className="cadence-item">
                    <div className="cadence-label">{c.label}</div>
                    <div className="cadence-products">{c.products}</div>
                    {c.note && <div className="cadence-note">{c.note}</div>}
                    <div className="cadence-copy">{c.copy}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="pricing-panel reveal">
              <div className="sub-coming-badge" style={{ marginBottom: '16px' }}>Subscription Coming Soon</div>
              <div className="sub-footnote" style={{ marginBottom: '24px' }}>
                Right now, SOLUM is available as a one-time purchase only. Subscription, where refills arrive automatically before you run out, is coming soon. Join the early access list and we will notify you the moment it launches.
              </div>
              <div className="sub-early-access">
                <div className="sub-early-access-label">Early Access</div>
                <div className="sub-early-access-body">Be first to know when subscription launches.</div>
                {eaState === 'done' ? (
                  <div className="sub-ea-success">You're on the list. We'll be in touch.</div>
                ) : (
                  <form className="sub-ea-form" onSubmit={handleEarlyAccess}>
                    <input
                      className="sub-ea-input"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                    <button className="sub-ea-btn" type="submit" disabled={eaState === 'submitting'}>
                      {eaState === 'submitting' ? 'Adding...' : 'Join Early Access →'}
                    </button>
                    {eaState === 'error' && (
                      <div style={{ fontSize: '13px', color: '#e05c5c', marginTop: '8px' }}>Something went wrong. Try again.</div>
                    )}
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
