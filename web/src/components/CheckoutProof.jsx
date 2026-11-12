import AwardProof from './AwardProof.jsx';
import { PRESS } from '../data/press.js';
import './CheckoutProof.css';

const publications = [...PRESS.filter(item => item.tier === 'lead'), ...PRESS.filter(item => item.tier !== 'lead')];

export default function CheckoutProof({ kitId, prominent = false }) {
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
