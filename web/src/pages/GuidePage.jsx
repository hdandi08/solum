import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Nav from '../components/Nav';
import SolumFooter from '../components/SolumFooter';
import { ARTICLES, CATEGORY_COLOURS } from '../data/guide';

const CSS = `
.guide-page { background: var(--black); min-height: 100vh; padding-top: 64px; }

/* Hero */
.guide-hero {
  border-bottom: 1px solid var(--line);
  padding: 80px 48px 64px;
  max-width: 1400px;
  margin: 0 auto;
}
.guide-hero-eyebrow {
  font-size: 11px; letter-spacing: 5px; text-transform: uppercase;
  color: var(--blit); font-weight: 600; margin-bottom: 20px; display: block;
}
.guide-hero-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(52px, 6vw, 96px);
  letter-spacing: 0.04em; line-height: 0.9;
  color: var(--bone); margin-bottom: 24px;
}
.guide-hero-body {
  font-size: 18px; font-weight: 300; line-height: 1.65;
  color: var(--stone); max-width: 600px;
}

/* Grid */
.guide-grid-wrap {
  max-width: 1400px; margin: 0 auto;
  padding: 64px 48px 96px;
}
.guide-grid-label {
  font-size: 10px; letter-spacing: 5px; text-transform: uppercase;
  color: var(--blit); font-weight: 600; opacity: 0.6;
  margin-bottom: 32px; display: block;
}
.guide-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
}

/* Card */
.guide-card {
  background: var(--char);
  border: 1px solid var(--line);
  padding: 36px 32px 32px;
  text-decoration: none;
  display: flex; flex-direction: column;
  gap: 16px;
  transition: background 0.2s, border-color 0.2s;
  position: relative;
  overflow: hidden;
}
.guide-card::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: var(--cat-colour, var(--blue));
  opacity: 0;
  transition: opacity 0.2s;
}
.guide-card:hover {
  background: var(--mid);
  border-color: var(--lineb);
}
.guide-card:hover::before { opacity: 1; }

.guide-card-top {
  display: flex; justify-content: space-between; align-items: center;
}
.guide-card-cat {
  font-size: 10px; letter-spacing: 4px; text-transform: uppercase;
  font-weight: 600;
}
.guide-card-read {
  font-size: 11px; letter-spacing: 2px; color: var(--stone); opacity: 0.6;
}
.guide-card-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 30px; letter-spacing: 0.04em; line-height: 1;
  color: var(--bone);
}
.guide-card-intro {
  font-size: 14px; font-weight: 300; line-height: 1.6;
  color: var(--stone);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.guide-card-arrow {
  font-size: 12px; letter-spacing: 3px; text-transform: uppercase;
  color: var(--blue); font-weight: 600;
  margin-top: auto;
  transition: letter-spacing 0.2s;
}
.guide-card:hover .guide-card-arrow { letter-spacing: 4px; }

/* Pillar card (first article — full width) */
.guide-card.pillar {
  grid-column: 1 / -1;
  flex-direction: row;
  align-items: flex-start;
  gap: 48px;
  padding: 48px;
}
.guide-card.pillar .pillar-left { flex: 1; display: flex; flex-direction: column; gap: 16px; }
.guide-card.pillar .pillar-right {
  width: 280px; flex-shrink: 0;
  display: flex; flex-direction: column;
  justify-content: center; gap: 12px;
  border-left: 1px solid var(--line);
  padding-left: 48px;
}
.guide-card.pillar .guide-card-title { font-size: 52px; }
.guide-card.pillar .guide-card-intro { -webkit-line-clamp: 4; }
.pillar-stat {
  display: flex; flex-direction: column; gap: 4px;
}
.pillar-stat-num {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 36px; letter-spacing: 0.06em;
  color: var(--bone);
}
.pillar-stat-label {
  font-size: 11px; letter-spacing: 3px; text-transform: uppercase;
  color: var(--stone); opacity: 0.5;
}
.pillar-divider { height: 1px; background: var(--line); }

@media (max-width: 1024px) {
  .guide-grid { grid-template-columns: repeat(2, 1fr); }
  .guide-card.pillar { flex-direction: column; }
  .guide-card.pillar .pillar-right { width: auto; border-left: none; padding-left: 0; border-top: 1px solid var(--line); padding-top: 24px; flex-direction: row; gap: 32px; }
}
@media (max-width: 768px) {
  .guide-hero { padding: 48px 24px 40px; }
  .guide-grid-wrap { padding: 40px 24px 64px; }
  .guide-grid { grid-template-columns: 1fr; }
  .guide-card.pillar { grid-column: auto; }
  .guide-card.pillar .pillar-right { flex-direction: column; }
}
`;

export default function GuidePage() {
  useEffect(() => {
    document.title = "The SOLUM Guide | Men's Body Care";
    let meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', "Guides on men's body care — the right shower routine, how to exfoliate, why sulphates damage your skin, and more. Education-first, no fluff.");
  }, []);

  const [pillar, ...rest] = ARTICLES;

  return (
    <>
      <style>{CSS}</style>
      <Nav />
      <div className="guide-page">

        <div className="guide-hero">
          <span className="guide-hero-eyebrow">SOLUM · The Guide</span>
          <h1 className="guide-hero-title">Men's Body Care.<br />Done Right.</h1>
          <p className="guide-hero-body">
            Most men shower every day and still have rough skin. Not laziness — nobody ever explained what actually works. These guides fix that.
          </p>
        </div>

        <div className="guide-grid-wrap">
          <span className="guide-grid-label">{ARTICLES.length} Guides</span>
          <div className="guide-grid">

            {/* Pillar — full width */}
            <Link
              to={`/guide/${pillar.slug}`}
              className="guide-card pillar"
              style={{ '--cat-colour': CATEGORY_COLOURS[pillar.category] }}
            >
              <div className="pillar-left">
                <div className="guide-card-top">
                  <span className="guide-card-cat" style={{ color: CATEGORY_COLOURS[pillar.category] }}>{pillar.category}</span>
                  <span className="guide-card-read">{pillar.readMins} min read</span>
                </div>
                <div className="guide-card-title">{pillar.title}</div>
                <div className="guide-card-intro">{pillar.intro}</div>
                <div className="guide-card-arrow">Read the guide →</div>
              </div>
              <div className="pillar-right">
                <div className="pillar-stat">
                  <span className="pillar-stat-num">10</span>
                  <span className="pillar-stat-label">Minutes daily</span>
                </div>
                <div className="pillar-divider" />
                <div className="pillar-stat">
                  <span className="pillar-stat-num">22</span>
                  <span className="pillar-stat-label">Minutes weekly</span>
                </div>
                <div className="pillar-divider" />
                <div className="pillar-stat">
                  <span className="pillar-stat-num">8</span>
                  <span className="pillar-stat-label">Products. System.</span>
                </div>
              </div>
            </Link>

            {/* Rest */}
            {rest.map(article => (
              <Link
                key={article.slug}
                to={`/guide/${article.slug}`}
                className="guide-card"
                style={{ '--cat-colour': CATEGORY_COLOURS[article.category] }}
              >
                <div className="guide-card-top">
                  <span className="guide-card-cat" style={{ color: CATEGORY_COLOURS[article.category] }}>{article.category}</span>
                  <span className="guide-card-read">{article.readMins} min read</span>
                </div>
                <div className="guide-card-title">{article.title}</div>
                <div className="guide-card-intro">{article.intro}</div>
                <div className="guide-card-arrow">Read →</div>
              </Link>
            ))}

          </div>
        </div>

        <SolumFooter />
      </div>
    </>
  );
}
