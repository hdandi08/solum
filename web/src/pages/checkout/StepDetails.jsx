const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function StepDetails({ form, onChange, onNext, loading, error }) {
  function handleSubmit(e) {
    e.preventDefault();
    onNext();
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="co-step-heading">Your Details.</div>
      <div className="co-step-subhead">Takes 60 seconds. We only ask what we need.</div>

      <div className="co-row">
        <div className="co-field">
          <label className="co-label">First Name</label>
          <input
            className="co-input"
            value={form.first_name}
            onChange={onChange('first_name')}
            placeholder="James"
            autoComplete="given-name"
          />
        </div>
        <div className="co-field">
          <label className="co-label">
            Last Name <span className="co-label-opt">optional</span>
          </label>
          <input
            className="co-input"
            value={form.last_name}
            onChange={onChange('last_name')}
            placeholder="Smith"
            autoComplete="family-name"
          />
        </div>
      </div>

      <div className="co-field">
        <label className="co-label">Email</label>
        <input
          className="co-input"
          type="email"
          value={form.email}
          onChange={onChange('email')}
          placeholder="james@example.com"
          autoComplete="email"
        />
      </div>

      <div className="co-field">
        <label className="co-label">Phone</label>
        <input
          className="co-input"
          type="tel"
          value={form.phone}
          onChange={onChange('phone')}
          placeholder="+44 7700 900000"
          autoComplete="tel"
        />
      </div>

      <div className="co-section-divider">Date of Birth</div>

      <div className="co-row">
        <div className="co-field">
          <label className="co-label">Birth Month</label>
          <select
            className="co-input"
            value={form.birth_month}
            onChange={onChange('birth_month')}
            style={{ cursor: 'pointer' }}
          >
            <option value="">Month</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div className="co-field">
          <label className="co-label">Birth Year</label>
          <input
            className="co-input"
            type="number"
            min="1940"
            max="2006"
            value={form.birth_year}
            onChange={onChange('birth_year')}
            placeholder="1990"
          />
        </div>
      </div>

      {error && <div className="co-error">{error}</div>}

      <button type="submit" className="co-submit" disabled={loading}>
        {loading ? 'Checking…' : 'Next: Delivery →'}
      </button>

      <div className="co-inline-trust">
        <div className="co-inline-trust-item">
          <span>🔒</span>
          <span>Your information is encrypted and never sold</span>
        </div>
        <div className="co-inline-trust-item">
          <span>📧</span>
          <span>We'll only email you about your order and subscription</span>
        </div>
      </div>
    </form>
  );
}
