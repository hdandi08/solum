import { useState, useEffect } from 'react';

const CSS = `
nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:0 48px;height:64px;background:rgba(8,9,11,0.94);backdrop-filter:blur(14px);border-bottom:1px solid var(--lineb);}
.nav-logo{font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:0.18em;color:var(--bone);text-decoration:none;}
.nav-links{display:flex;gap:36px;list-style:none;margin:0;padding:0;}
.nav-links a{font-size:11px;letter-spacing:5px;text-transform:uppercase;color:var(--stone);text-decoration:none;transition:color .2s;}
.nav-links a:hover,.nav-links a.active-link{color:var(--bone);}
.nav-right{display:flex;align-items:center;gap:24px;}
.nav-account{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--stone);text-decoration:none;transition:color .2s;}
.nav-account:hover{color:var(--bone);}
.nav-cta{font-size:11px;letter-spacing:4px;text-transform:uppercase;background:var(--bone);color:var(--black);padding:10px 24px;text-decoration:none;transition:background .2s;}
.nav-cta:hover{background:#fff;}
@media(max-width:768px){.nav-links{display:none;}.nav{padding:0 24px;}}
`;

const NAV_LINKS = [
  ['#truth', 'Why SOLUM'],
  ['#kits', 'Kits'],
  ['#products', 'Products'],
  ['#ritual', 'The Ritual'],
  ['#subscription', 'Subscription'],
];

export default function Nav() {
  const [activeNav, setActiveNav] = useState('');

  useEffect(() => {
    const handler = () => {
      let cur = '';
      document.querySelectorAll('section[id]').forEach(s => {
        if (window.scrollY >= s.offsetTop - 100) cur = s.id;
      });
      setActiveNav(cur);
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <>
      <style>{CSS}</style>
      <nav>
        <a href="#home" className="nav-logo">SOLUM</a>
        <ul className="nav-links">
          {NAV_LINKS.map(([href, label]) => (
            <li key={href}>
              <a href={href} className={activeNav === href.slice(1) ? 'active-link' : ''}>{label}</a>
            </li>
          ))}
        </ul>
        <div className="nav-right">
          <a href="/account" className="nav-account">Account</a>
          <a href="#kits" className="nav-cta">Choose Your Kit</a>
        </div>
      </nav>
    </>
  );
}
