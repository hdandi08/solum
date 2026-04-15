import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import Nav from '../components/Nav';
import SolumFooter from '../components/SolumFooter';
import { getArticle, ARTICLES, CATEGORY_COLOURS } from '../data/guide';
import NotFoundPage from './NotFoundPage';

const CSS = `
.article-page { background: var(--black); min-height: 100vh; padding-top: 64px; }

/* Layout */
.article-outer {
  max-width: 1400px; margin: 0 auto;
  padding: 64px 48px 96px;
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 80px;
  align-items: start;
}

/* Back link */
.article-back {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 11px; letter-spacing: 4px; text-transform: uppercase;
  color: var(--stone); text-decoration: none; font-weight: 600;
  transition: color 0.2s;
  margin-bottom: 40px;
}
.article-back:hover { color: var(--bone); }

/* Article header */
.article-cat {
  font-size: 11px; letter-spacing: 4px; text-transform: uppercase;
  font-weight: 600; margin-bottom: 16px; display: block;
}
.article-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(44px, 5vw, 72px);
  letter-spacing: 0.03em; line-height: 0.9;
  color: var(--bone); margin-bottom: 28px;
}
.article-meta {
  display: flex; align-items: center; gap: 20px;
  font-size: 12px; letter-spacing: 3px; text-transform: uppercase;
  color: var(--stone); opacity: 0.6;
  margin-bottom: 40px;
  padding-bottom: 40px;
  border-bottom: 1px solid var(--line);
}
.article-intro {
  font-size: 19px; font-weight: 300; line-height: 1.7;
  color: var(--mist);
  margin-bottom: 48px;
}

/* Body sections */
.article-section { margin-bottom: 48px; }
.article-h2 {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 30px; letter-spacing: 0.04em; line-height: 1;
  color: var(--bone); margin-bottom: 20px;
}
.article-para {
  font-size: 16px; font-weight: 300; line-height: 1.8;
  color: var(--stone);
  margin-bottom: 16px;
}
.article-para:last-child { margin-bottom: 0; }

/* Tip callout */
.article-tip {
  border-left: 3px solid var(--blue);
  background: rgba(46,109,164,0.07);
  padding: 16px 20px;
  margin: 24px 0;
  font-size: 15px; font-weight: 400; line-height: 1.6;
  color: var(--bone); opacity: 0.85;
}

/* Divider */
.article-divider { height: 1px; background: var(--line); margin: 48px 0; }

/* CTA block */
.article-cta {
  border: 1px solid var(--lineb);
  background: rgba(46,109,164,0.06);
  padding: 36px;
  margin-top: 56px;
}
.article-cta-heading {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 28px; letter-spacing: 0.04em;
  color: var(--bone); margin-bottom: 12px;
}
.article-cta-body {
  font-size: 15px; font-weight: 300; line-height: 1.6;
  color: var(--stone); margin-bottom: 24px;
}
.article-cta-btn {
  display: inline-block;
  font-size: 11px; letter-spacing: 4px; text-transform: uppercase;
  font-weight: 600; padding: 12px 28px;
  background: var(--bone); color: var(--black);
  text-decoration: none;
  transition: background 0.2s;
}
.article-cta-btn:hover { background: #fff; }

/* Sidebar */
.article-sidebar { position: sticky; top: 84px; }
.sidebar-block {
  background: var(--char);
  border: 1px solid var(--line);
  padding: 28px;
  margin-bottom: 16px;
}
.sidebar-label {
  font-size: 10px; letter-spacing: 4px; text-transform: uppercase;
  color: var(--blit); font-weight: 600; opacity: 0.7;
  margin-bottom: 16px; display: block;
}
.sidebar-toc { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
.sidebar-toc li {
  font-size: 13px; font-weight: 400; line-height: 1.4;
  color: var(--stone); padding-left: 12px;
  border-left: 2px solid var(--line);
}
.sidebar-related { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0; }
.sidebar-related li { border-bottom: 1px solid var(--line); }
.sidebar-related li:last-child { border-bottom: none; }
.sidebar-related a {
  display: block; padding: 12px 0;
  font-size: 13px; font-weight: 400; line-height: 1.4;
  color: var(--stone); text-decoration: none;
  transition: color 0.2s;
}
.sidebar-related a:hover { color: var(--bone); }

/* SOLUM branding in sidebar */
.sidebar-brand {
  text-align: center; padding: 24px;
}
.sidebar-brand-logo {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 32px; letter-spacing: 0.18em;
  color: var(--bone); display: block; margin-bottom: 8px;
}
.sidebar-brand-tag {
  font-size: 11px; letter-spacing: 3px; text-transform: uppercase;
  color: var(--stone); opacity: 0.5; display: block; margin-bottom: 20px;
}
.sidebar-brand-btn {
  display: block;
  font-size: 11px; letter-spacing: 3px; text-transform: uppercase;
  font-weight: 600; padding: 11px 20px;
  background: var(--bone); color: var(--black);
  text-decoration: none; text-align: center;
  transition: background 0.2s;
}
.sidebar-brand-btn:hover { background: #fff; }

@media (max-width: 1024px) {
  .article-outer { grid-template-columns: 1fr; gap: 48px; }
  .article-sidebar { position: static; }
}
@media (max-width: 768px) {
  .article-outer { padding: 40px 24px 64px; }
  .article-title { font-size: 40px; }
}
`;

export default function GuideArticle() {
  const { slug } = useParams();
  const article = getArticle(slug);

  useEffect(() => {
    if (!article) return;
    document.title = article.metaTitle;
    let meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', article.metaDescription);
    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', `https://bysolum.co.uk/guide/${article.slug}`);
    window.scrollTo(0, 0);
  }, [article]);

  if (!article) return <NotFoundPage />;

  const related = ARTICLES.filter(a => article.relatedSlugs?.includes(a.slug));

  return (
    <>
      <style>{CSS}</style>
      <Nav />
      <div className="article-page">
        <div className="article-outer">

          {/* Main content */}
          <main>
            <Link to="/guide" className="article-back">← Back to Guide</Link>

            <span className="article-cat" style={{ color: CATEGORY_COLOURS[article.category] }}>
              {article.category}
            </span>
            <h1 className="article-title">{article.title}</h1>
            <div className="article-meta">
              <span>SOLUM Guide</span>
              <span>·</span>
              <span>{article.readMins} min read</span>
            </div>

            <p className="article-intro">{article.intro}</p>

            {article.sections.map((section, i) => (
              <div key={i} className="article-section">
                {i > 0 && <div className="article-divider" />}
                <h2 className="article-h2">{section.h2}</h2>
                {section.paras.map((para, j) => (
                  <p key={j} className="article-para">{para}</p>
                ))}
                {section.tip && (
                  <div className="article-tip">{section.tip}</div>
                )}
              </div>
            ))}

            {article.cta && (
              <div className="article-cta">
                <div className="article-cta-heading">{article.cta.heading}</div>
                <div className="article-cta-body">{article.cta.body}</div>
                <a href={article.cta.link} className="article-cta-btn">{article.cta.label}</a>
              </div>
            )}
          </main>

          {/* Sidebar */}
          <aside className="article-sidebar">

            <div className="sidebar-block sidebar-brand">
              <span className="sidebar-brand-logo">SOLUM</span>
              <span className="sidebar-brand-tag">Men's Body Care System</span>
              <a href="/full#kits" className="sidebar-brand-btn">Choose Your Kit</a>
            </div>

            <div className="sidebar-block">
              <span className="sidebar-label">In This Article</span>
              <ul className="sidebar-toc">
                {article.sections.map((s, i) => (
                  <li key={i}>{s.h2}</li>
                ))}
              </ul>
            </div>

            {related.length > 0 && (
              <div className="sidebar-block">
                <span className="sidebar-label">Related Guides</span>
                <ul className="sidebar-related">
                  {related.map(r => (
                    <li key={r.slug}>
                      <Link to={`/guide/${r.slug}`}>{r.title}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </aside>
        </div>

        <SolumFooter />
      </div>
    </>
  );
}
