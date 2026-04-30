const CSS = `
footer.solum-footer{background:var(--black);border-top:1px solid var(--line);padding:56px 48px 32px;}
.footer-inner{max-width:1400px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:48px;margin-bottom:48px;}
.footer-logo{display:block;margin-bottom:10px;}.footer-logo img{height:24px;width:auto;display:block;}
.footer-tagline{font-size:13px;color:var(--stone);letter-spacing:2px;font-style:italic;margin-bottom:8px;}
.footer-scope{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--blit);font-weight:600;}
.footer-col-title{font-size:11px;letter-spacing:5px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:20px;}
.footer-links{display:flex;flex-direction:column;gap:10px;list-style:none;padding:0;margin:0;}
.footer-links a{font-size:14px;color:var(--stone);text-decoration:none;letter-spacing:.5px;transition:color .2s;}
.footer-links a:hover{color:var(--bone);}
.footer-links a.founding{color:var(--sky);letter-spacing:1.5px;}
.footer-links a.founding:hover{color:#7ab8e0;}
.footer-ig{display:flex;align-items:center;gap:8px;}
.footer-ig svg{flex-shrink:0;opacity:.7;transition:opacity .2s;}
.footer-ig:hover svg{opacity:1;}
.footer-bottom{max-width:1400px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--line);padding-top:24px;font-size:13px;color:var(--stone);letter-spacing:2px;}
@media(max-width:768px){.footer-inner{grid-template-columns:1fr 1fr;gap:32px;}.solum-footer{padding:40px 24px 24px;}.footer-bottom{flex-direction:column;gap:12px;text-align:center;}}
`;

export default function SolumFooter() {
  return (
    <>
      <style>{CSS}</style>
      <footer className="solum-footer">
        <div className="footer-inner">
          <div>
            <div className="footer-logo"><img src="/solum-wordmark-clean.svg" alt="SOLUM" /></div>
            <div className="footer-tagline">Your body. Done right.</div>
            <div className="footer-scope">Body Care · Men</div>
          </div>
          <div>
            <div className="footer-col-title">The System</div>
            <ul className="footer-links">
              <li><a href="#kits">Choose Your Kit</a></li>
              <li><a href="#products">The Products</a></li>
              <li><a href="#ritual">The Ritual</a></li>
              <li><a href="#subscription">Subscription</a></li>
            </ul>
          </div>
          <div>
            <div className="footer-col-title">The Brand</div>
            <ul className="footer-links">
              <li><a href="#truth">Why SOLUM</a></li>
              <li><a href="#origins">Where It's From</a></li>
              <li><a href="/guide">The Guide</a></li>
              <li><a href="/founding-100" className="founding">Founding 100 ↗</a></li>
            </ul>
          </div>
          <div>
            <div className="footer-col-title">Contact</div>
            <ul className="footer-links">
              <li><a href="mailto:contact@bysolum.com">contact@bysolum.com</a></li>
              <li><a href="https://bysolum.co.uk">bysolum.co.uk</a></li>
              <li>
                <a href="https://instagram.com/bysolum.body" target="_blank" rel="noopener noreferrer" className="footer-ig">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                    <circle cx="12" cy="12" r="4"/>
                    <circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none"/>
                  </svg>
                  @bysolum.body
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Bysolum Limited · bysolum.co.uk</span>
          <span style={{display:'flex',gap:'20px',alignItems:'center'}}>
            <a href="/terms" style={{color:'inherit',textDecoration:'none',letterSpacing:'2px',fontSize:'12px'}}>Terms &amp; Conditions</a>
            <span>·</span>
            <a href="/privacy" style={{color:'inherit',textDecoration:'none',letterSpacing:'2px',fontSize:'12px'}}>Privacy Policy</a>
            <span>·</span>
            <span>Body Care · Not Face. Not Hair.</span>
          </span>
        </div>
      </footer>
    </>
  );
}
