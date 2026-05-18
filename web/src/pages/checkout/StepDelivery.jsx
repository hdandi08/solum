function fmtDay(d) {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function StepDelivery({ form, onChange, onBack, onNext, loading, error, dispatch, arrival }) {
  function handleSubmit(e) {
    e.preventDefault();
    onNext();
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="co-step-heading">Delivery.</div>
      <div className="co-step-subhead">UK delivery only · Royal Mail Tracked 48 · Free shipping</div>

      <div className="co-field">
        <label className="co-label">Address Line 1</label>
        <input
          className="co-input"
          value={form.line1}
          onChange={onChange('line1')}
          placeholder="14 Example Street"
          autoComplete="address-line1"
        />
      </div>

      <div className="co-field">
        <label className="co-label">
          Address Line 2 <span className="co-label-opt">optional</span>
        </label>
        <input
          className="co-input"
          value={form.line2}
          onChange={onChange('line2')}
          placeholder="Flat 2"
          autoComplete="address-line2"
        />
      </div>

      <div className="co-row">
        <div className="co-field">
          <label className="co-label">City / Town</label>
          <input
            className="co-input"
            value={form.city}
            onChange={onChange('city')}
            placeholder="London"
            autoComplete="address-level2"
          />
        </div>
        <div className="co-field">
          <label className="co-label">Postcode</label>
          <input
            className="co-input"
            value={form.postcode}
            onChange={onChange('postcode')}
            placeholder="SW1A 1AA"
            autoComplete="postal-code"
            style={{ textTransform: 'uppercase' }}
          />
        </div>
      </div>

      {/* Shipping date — shown at the moment the customer is entering their address */}
      <div className="co-ship-strip">
        <span className="co-ship-strip-icon">📦</span>
        <div className="co-ship-strip-text">
          <span className="co-ship-strip-main">
            Ships {fmtDay(dispatch)} · Arrives {fmtDay(arrival)}
          </span>
          <span className="co-ship-strip-sub">Royal Mail Tracked 48 · Free</span>
        </div>
      </div>

      {error && <div className="co-error">{error}</div>}

      <button type="submit" className="co-submit" disabled={loading}>
        {loading ? 'Preparing payment…' : 'Continue to Payment →'}
      </button>

      <button type="button" className="co-back-btn" onClick={onBack}>
        ← Back to your details
      </button>
    </form>
  );
}
