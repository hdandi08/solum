const CSS = `
.trust-bar{
  width:100%;background:#0d0e12;border-bottom:1px solid var(--line);
  padding:9px 24px;display:flex;align-items:center;justify-content:center;
  gap:0;flex-wrap:wrap;
}
.trust-bar-items{
  display:flex;align-items:center;gap:0;flex-wrap:wrap;justify-content:center;
}
.trust-item{
  display:flex;align-items:center;gap:6px;
  font-size:10px;letter-spacing:1.8px;text-transform:uppercase;
  color:rgba(240,236,226,0.5);font-weight:600;white-space:nowrap;
  padding:0 18px;
}
.trust-item:not(:last-child){border-right:1px solid var(--line);}
.trust-icon{flex-shrink:0;opacity:.7;}
.trust-item-co{color:rgba(240,236,226,0.35);}

@media(max-width:640px){
  .trust-bar{padding:8px 12px;}
  .trust-item{padding:4px 10px;font-size:9px;letter-spacing:1.2px;}
  .trust-item.trust-hide-mobile{display:none;}
}
`;

const LockIcon = () => (
  <svg className="trust-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const TruckIcon = () => (
  <svg className="trust-icon" width="12" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 3h15v13H1z"/><path d="M16 8h4l3 4v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);

const CheckIcon = () => (
  <svg className="trust-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const BuildingIcon = () => (
  <svg className="trust-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="18" rx="1"/><path d="M8 21V8h8v13"/><path d="M12 8v13"/>
  </svg>
);

export default function TrustBar() {
  return (
    <>
      <style>{CSS}</style>
      <div className="trust-bar">
        <div className="trust-bar-items">
          <div className="trust-item">
            <LockIcon />
            Secure checkout · Stripe
          </div>
          <div className="trust-item">
            <TruckIcon />
            Free UK delivery
          </div>
          <div className="trust-item trust-hide-mobile">
            <CheckIcon />
            Royal Mail Tracked 48
          </div>
          <div className="trust-item trust-item-co trust-hide-mobile">
            <BuildingIcon />
            Bysolum Limited · Co. 17117056
          </div>
        </div>
      </div>
    </>
  );
}
