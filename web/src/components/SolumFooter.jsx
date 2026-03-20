const CSS = `
footer.solum-footer{background:var(--black);border-top:1px solid var(--line);padding:56px 48px 32px;}
.footer-inner{max-width:1400px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:48px;margin-bottom:48px;}
.footer-logo{font-family:'Bebas Neue',sans-serif;font-size:32px;letter-spacing:.18em;color:var(--bone);margin-bottom:10px;display:block;}
.footer-tagline{font-size:13px;color:var(--stone);letter-spacing:2px;font-style:italic;margin-bottom:8px;}
.footer-scope{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--blue);font-weight:600;}
.footer-col-title{font-size:11px;letter-spacing:5px;text-transform:uppercase;color:var(--blue);font-weight:600;margin-bottom:20px;}
.footer-links{display:flex;flex-direction:column;gap:10px;list-style:none;padding:0;margin:0;}
.footer-links a{font-size:14px;color:var(--stone);text-decoration:none;letter-spacing:.5px;transition:color .2s;}
.footer-links a:hover{color:var(--bone);}
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
            <span className="footer-logo">SOLUM</span>
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
            </ul>
          </div>
          <div>
            <div className="footer-col-title">Contact</div>
            <ul className="footer-links">
              <li><a href="mailto:harsha@pricedab.com">harsha@pricedab.com</a></li>
              <li><a href="https://bysolum.com">bysolum.com</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 SOLUM · bysolum.com</span>
          <span>Body Care · Not Face. Not Hair.</span>
        </div>
      </footer>
    </>
  );
}
