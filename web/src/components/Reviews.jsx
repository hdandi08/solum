import { useEffect, useRef } from 'react';
import { REVIEWS } from '../data/reviews.js';

const CSS = `
.reviews-section{background:var(--black);padding:100px 48px;border-top:1px solid var(--line);}
.reviews-inner{max-width:1200px;margin:0 auto;}
.reviews-header{text-align:center;margin-bottom:56px;}
.reviews-stars-lead{color:var(--blit);font-size:22px;letter-spacing:4px;margin-bottom:16px;}
.reviews-header h2{font-family:'Bebas Neue',sans-serif;font-size:clamp(32px,3.6vw,56px);letter-spacing:.06em;color:var(--bone);line-height:1.05;}
.reviews-header p{font-size:13px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);font-weight:600;margin-top:12px;}
.reviews-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line);}
.review-card{background:var(--char);padding:32px 28px;display:flex;flex-direction:column;}
.review-stars{color:var(--blit);font-size:15px;letter-spacing:3px;margin-bottom:16px;}
.review-headline{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:19px;line-height:1.25;color:var(--bone);margin-bottom:14px;}
.review-body{font-size:15px;font-weight:300;line-height:1.6;color:var(--mist);margin-bottom:24px;flex:1;}
.review-author{display:flex;align-items:center;gap:12px;}
.review-avatar{width:42px;height:42px;border-radius:50%;object-fit:cover;flex-shrink:0;background:var(--mid);}
.review-avatar-mono{width:42px;height:42px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:19px;letter-spacing:.04em;color:var(--bone);background:linear-gradient(135deg,#1A4A78,#2E6DA4);}
.review-author-name{font-size:14px;font-weight:600;color:var(--bone);letter-spacing:.3px;}
.review-author-desc{font-size:13px;font-weight:300;color:var(--stone);}
@media(max-width:900px){.reviews-grid{grid-template-columns:repeat(2,1fr);}}
@media(max-width:600px){
  .reviews-section{padding:56px 20px;}
  .reviews-grid{grid-template-columns:1fr;}
  .review-card{padding:26px 22px;}
}
`;

function Stars({ n }) {
  return <div className="review-stars" aria-label={`${n} out of 5 stars`}>{'★'.repeat(n)}</div>;
}

export default function Reviews() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    section.querySelectorAll('.reveal').forEach((el) => obs.observe(el));

    return () => obs.disconnect();
  }, []);

  return (
    <>
      <style>{CSS}</style>
      <section className="reviews-section" id="reviews" data-track="reviews" ref={sectionRef}>
        <div className="reviews-inner">
          <div className="reviews-header reveal">
            <div className="reviews-stars-lead" aria-hidden="true">{'★★★★★'}</div>
            <h2>Rated 5/5 by our first users</h2>
            <p>Real results, head to toe</p>
          </div>
          <div className="reviews-grid reveal">
            {REVIEWS.map(r => (
              <article key={r.id} className="review-card">
                <Stars n={r.rating} />
                <h3 className="review-headline">{r.headline}</h3>
                <p className="review-body">{r.body}</p>
                <div className="review-author">
                  {r.photo
                    ? <img src={r.photo} alt={r.name} className="review-avatar" loading="lazy" />
                    : <div className="review-avatar-mono" aria-hidden="true">{r.name.charAt(0)}</div>}
                  <div>
                    <div className="review-author-name">{r.name}</div>
                    <div className="review-author-desc">{r.descriptor}</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
