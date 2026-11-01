import './AlternativeKitOffer.css';

export default function AlternativeKitOffer({ kit, onSwitch, busy = false, subscription = false }) {
  if (!kit) return null;
  return (
    <section className="alternative-kit" aria-label="Available alternative kit">
      <div className="alternative-kit-summary">
        <img src={kit.image} alt={`SOLUM ${kit.name} kit`} width="112" height="112" />
        <div>
          <h2>{kit.name} is available</h2>
          <p>{kit.id === 'ritual'
            ? 'Everything in GROUND, plus body oil and a mixing bowl. 9 products, £20 more.'
            : 'The 7-piece kit for your daily clean and weekly clay ritual. Without the body oil and mixing bowl. £20 less.'}</p>
          <p className="alternative-kit-price">£{kit.firstBoxPrice} {subscription ? `first box, then £${kit.monthlyPrice}/month` : 'one-time. UK delivery included.'}</p>
        </div>
      </div>
      <button type="button" className="co-submit" disabled={busy} onClick={() => onSwitch(kit.id)}>
        {busy ? 'Checking availability…' : `Switch to ${kit.name} · £${kit.firstBoxPrice}`}
      </button>
    </section>
  );
}
