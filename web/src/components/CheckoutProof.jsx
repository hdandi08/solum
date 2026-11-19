import AwardProof from './AwardProof.jsx';
import { PRESS } from '../data/press.js';
import './CheckoutProof.css';

const publications = [...PRESS.filter(item => item.tier === 'lead'), ...PRESS.filter(item => item.tier !== 'lead')];

export default function CheckoutProof({ kitId, prominent = false, condensed = false }) {
  if (condensed) return (
    <div className="checkout-proof checkout-proof-condensed" aria-label="Awards and press">
      <a className="checkout-proof-award" href="/awards" target="_blank" rel="noreferrer">
        <AwardProof compact sealOnly />
        <span className="checkout-proof-award-text">
          <strong>RITUAL · Best Grooming Kit</strong>
          <span>Esquire Grooming Awards 2026</span>
        </span>
      </a>
      <div className="checkout-proof-logos" aria-label="Featured in">
        {publications.map(item => (
          <a key={item.name} href={item.url} title={item.name} target="_blank" rel="noreferrer">
            <img className="checkout-publication-logo" src={item.checkoutLogo ?? item.logo} alt={item.name} width="104" height="32" />
          </a>
        ))}
      </div>
    </div>
  );
  return (
    <div className={`checkout-proof${prominent ? ' checkout-proof-prominent' : ''}`} aria-label="Awards and press">
      <AwardProof compact={!prominent} kitName={kitId === 'ritual' ? undefined : 'RITUAL'} />
      <div className="checkout-proof-publications" aria-label="Published press features">
        <span className="checkout-proof-label">Featured in</span>
        {publications.map(item => (
          <a key={item.name} href={item.url} title={item.name} target="_blank" rel="noreferrer">
            <img className="checkout-publication-logo" src={item.checkoutLogo ?? item.logo} alt={item.name} width="104" height="32" />
          </a>
        ))}
      </div>
    </div>
  );
}
