import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CSS = `
.nf-page{min-height:100vh;background:var(--black);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 24px;position:relative;overflow:hidden;}
.nf-page::before{content:'';position:absolute;inset:0;z-index:0;background-image:linear-gradient(rgba(46,109,164,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(46,109,164,0.03) 1px,transparent 1px);background-size:80px 80px;}
.nf-inner{position:relative;z-index:1;max-width:560px;width:100%;text-align:center;}
.nf-code{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:20px;}
.nf-heading{font-family:'Bebas Neue',sans-serif;font-size:clamp(64px,10vw,120px);letter-spacing:.04em;color:var(--bone);line-height:.9;margin-bottom:20px;}
.nf-body{font-size:16px;color:var(--stone);font-weight:300;line-height:1.6;margin-bottom:32px;}
.nf-countdown{font-size:13px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);margin-bottom:32px;}
.nf-countdown span{color:var(--blit);font-weight:600;}
.nf-link{display:inline-block;font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:.12em;color:var(--bone);text-decoration:none;border:1px solid var(--lineb);padding:14px 32px;transition:border-color .2s,color .2s;}
.nf-link:hover{border-color:var(--blue);color:#fff;}
`;

export default function NotFoundPage() {
  const [count, setCount] = useState(5);
  const navigate = useNavigate();

  useEffect(() => {
    if (count === 0) { navigate('/'); return; }
    const t = setTimeout(() => setCount(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, navigate]);

  return (
    <>
      <style>{CSS}</style>
      <div className="nf-page">
        <div className="nf-inner">
          <div className="nf-code">404</div>
          <div className="nf-heading">Page not<br />found.</div>
          <p className="nf-body">This page doesn't exist. It may have moved or the link may be incorrect.</p>
          <div className="nf-countdown">Redirecting in <span>{count}</span>s</div>
          <a className="nf-link" href="/">Go now →</a>
        </div>
      </div>
    </>
  );
}
