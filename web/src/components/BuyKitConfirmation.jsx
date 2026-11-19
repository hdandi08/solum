import { CheckoutDispatch } from './ExpressCheckoutInfo.jsx';
import './BuyKitConfirmation.css';

export default function BuyKitConfirmation({ kit, price, dispatch, onChange }) {
  return (
    <section className="buy-kit-card" data-testid="kit-confirm" aria-label="Selected kit">
      <header className="buy-kit-card-header">
        <span>Your kit</span>
        <button type="button" data-testid="change-kit" onClick={onChange}>Change kit</button>
      </header>
      <div className="buy-kit-card-main">
        {kit?.image && (
          <a className="buy-kit-card-image" href={kit.image} target="_blank" rel="noreferrer" aria-label={`View full-size ${kit.name} kit photo`}>
            <img src={kit.image.replace('.webp', '@600.webp')} alt={`SOLUM ${kit.name} kit in its presentation box`} width="600" height="750" />
          </a>
        )}
        <div className="buy-kit-card-details">
          <h2>{kit?.name}</h2>
          {kit?.id === 'ritual' && <span className="buy-kit-card-award">Award-winning kit</span>}
          <div className="buy-kit-card-payment">
            <p className="buy-kit-card-price"><strong>£{price}</strong><span>Total</span></p>
            <p className="buy-kit-card-delivery">
              <svg className="buy-kit-card-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                <path d="M1 3h14v13H1zM15 8h4l4 4v4h-8" />
                <circle cx="5.5" cy="18" r="2.5" /><circle cx="18.5" cy="18" r="2.5" />
              </svg>
              <span>Free UK delivery</span>
            </p>
          </div>
        </div>
      </div>
      {dispatch && <div className="buy-kit-card-dispatch">
        <svg className="buy-kit-card-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
          <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2" />
        </svg>
        <CheckoutDispatch dispatch={dispatch} />
      </div>}
    </section>
  );
}
