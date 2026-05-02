import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useVariant } from '../hooks/useVariant';

const CTA_COPY = { control: 'Choose Your Kit', ritual: 'Build Your Ritual' };

const CSS = `
nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:0 48px;height:64px;background:rgba(8,9,11,0.94);backdrop-filter:blur(14px);border-bottom:1px solid var(--lineb);}
.nav-logo{display:flex;align-items:center;text-decoration:none;}.nav-logo img{height:20px;width:auto;display:block;}
.nav-links{display:flex;gap:36px;list-style:none;margin:0;padding:0;}
.nav-links a{font-size:11px;letter-spacing:5px;text-transform:uppercase;color:var(--stone);text-decoration:none;transition:color .2s;}
.nav-links a:hover,.nav-links a.active-link{color:var(--bone);}
.nav-right{display:flex;align-items:center;gap:24px;}
.nav-account{display:flex;align-items:center;gap:7px;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--stone);text-decoration:none;transition:color .2s;}
.nav-account:hover{color:var(--bone);}
.nav-account svg{flex-shrink:0;transition:stroke .2s;}
.nav-account.logged-in{color:var(--bone);}
.nav-account.logged-in svg{stroke:var(--blue);}
.nav-dot{width:6px;height:6px;border-radius:50%;background:var(--blue);flex-shrink:0;}
.nav-cta{font-size:11px;letter-spacing:4px;text-transform:uppercase;background:var(--bone);color:var(--black);padding:10px 24px;text-decoration:none;transition:background .2s;white-space:nowrap;}
.nav-cta:hover{background:#fff;}

/* hamburger — mobile only */
.nav-hamburger{display:none;flex-direction:column;justify-content:center;gap:5px;width:36px;height:36px;background:none;border:none;cursor:pointer;padding:4px;flex-shrink:0;}
.nav-hamburger span{display:block;width:22px;height:1.5px;background:var(--bone);transition:transform .25s, opacity .2s;}
.nav-hamburger.open span:nth-child(1){transform:translateY(6.5px) rotate(45deg);}
.nav-hamburger.open span:nth-child(2){opacity:0;}
.nav-hamburger.open span:nth-child(3){transform:translateY(-6.5px) rotate(-45deg);}

/* mobile drawer */
.nav-drawer{
  position:fixed;top:64px;left:0;right:0;bottom:0;z-index:99;
  background:var(--black);
  display:flex;flex-direction:column;
  padding:32px 28px 48px;
  transform:translateX(100%);
  transition:transform .3s cubic-bezier(.4,0,.2,1);
  overflow-y:auto;
  border-top:1px solid var(--line);
}
.nav-drawer.open{transform:translateX(0);}

.nav-drawer-links{list-style:none;margin:0;padding:0;flex:1;}
.nav-drawer-links li{border-bottom:1px solid var(--line);}
.nav-drawer-links a{
  display:block;
  font-family:'Bebas Neue',sans-serif;
  font-size:32px;letter-spacing:.06em;
  color:var(--stone);text-decoration:none;
  padding:18px 0;
  transition:color .2s;
}
.nav-drawer-links a:hover,.nav-drawer-links a.active-link{color:var(--bone);}

.nav-drawer-bottom{margin-top:32px;display:flex;flex-direction:column;gap:14px;}
.nav-drawer-account{display:flex;align-items:center;gap:8px;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--stone);text-decoration:none;}
.nav-drawer-account.logged-in{color:var(--bone);}
.nav-drawer-account.logged-in svg{stroke:var(--blue);}
.nav-drawer-cta{font-size:12px;letter-spacing:4px;text-transform:uppercase;background:var(--bone);color:var(--black);padding:16px 24px;text-decoration:none;text-align:center;font-weight:600;}

@media(max-width:768px){
  .nav-links{display:none;}
  .nav-right .nav-account,.nav-right .nav-cta{display:none;}
  nav{padding:0 20px;}
  .nav-hamburger{display:flex;}
}
`;

const NAV_LINKS = [
  ['#truth',        'Why SOLUM'],
  ['#kits',         'Kits'],
  ['#products',     'Products'],
  ['/ritual',       'The Ritual'],
  ['/guide',        'Guide'],
  ['#subscription', 'Subscription'],
];

export default function Nav() {
  const [activeNav, setActiveNav]   = useState('');
  const [menuOpen, setMenuOpen]     = useState(false);
  const [user, setUser]             = useState(null);
  const { pathname }                = useLocation();
  const ctaVariant                  = useVariant('hero-cta-copy');
  const ctaLabel                    = CTA_COPY[ctaVariant] ?? CTA_COPY.control;
  const onFullSite                  = pathname === '/full';

  const resolve = (href) => href.startsWith('#') && !onFullSite ? `/full${href}` : href;
  const close   = ()     => setMenuOpen(false);

  // lock body scroll when menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

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
        <a href={resolve('#home')} className="nav-logo" onClick={close}>
          <img src="/solum-wordmark-clean.svg" alt="SOLUM" />
        </a>

        {/* desktop links */}
        <ul className="nav-links">
          {NAV_LINKS.map(([href, label]) => (
            <li key={href}>
              <a href={resolve(href)} className={activeNav === href.slice(1) ? 'active-link' : ''}>{label}</a>
            </li>
          ))}
        </ul>

        {/* desktop right */}
        <div className="nav-right">
          <a href="/account" className={`nav-account${user ? ' logged-in' : ''}`}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="7.5" cy="5" r="2.8"/>
              <path d="M1.5 13.5c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/>
            </svg>
            {user ? (
              <>
                <span>{user.user_metadata?.first_name || user.email?.split('@')[0]}</span>
                <div className="nav-dot" />
              </>
            ) : (
              <span>Account</span>
            )}
          </a>
          <a href={resolve('#kits')} className="nav-cta">{ctaLabel}</a>
        </div>

        {/* hamburger */}
        <button
          className={`nav-hamburger${menuOpen ? ' open' : ''}`}
          onClick={() => setMenuOpen(o => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          <span /><span /><span />
        </button>
      </nav>

      {/* mobile drawer */}
      <div className={`nav-drawer${menuOpen ? ' open' : ''}`}>
        <ul className="nav-drawer-links">
          {NAV_LINKS.map(([href, label]) => (
            <li key={href}>
              <a
                href={resolve(href)}
                className={activeNav === href.slice(1) ? 'active-link' : ''}
                onClick={close}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>

        <div className="nav-drawer-bottom">
          <a href="/account" className={`nav-drawer-account${user ? ' logged-in' : ''}`} onClick={close}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="7.5" cy="5" r="2.8"/>
              <path d="M1.5 13.5c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/>
            </svg>
            {user ? (user.user_metadata?.first_name || user.email?.split('@')[0]) : 'Account'}
            {user && <div className="nav-dot" />}
          </a>
          <a href={resolve('#kits')} className="nav-drawer-cta" onClick={close}>{ctaLabel}</a>
        </div>
      </div>
    </>
  );
}
