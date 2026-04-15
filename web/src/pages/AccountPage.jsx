// web/src/pages/AccountPage.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY;

const CSS = `
.ac-page{min-height:100vh;background:var(--black);display:flex;align-items:center;justify-content:center;padding:48px 24px;font-family:'Barlow Condensed',sans-serif;}
.ac-wrap{width:100%;max-width:640px;}
.ac-logo{font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:.15em;color:var(--bone);margin-bottom:48px;display:block;text-decoration:none;}
.ac-heading{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,5vw,56px);letter-spacing:.04em;color:var(--bone);line-height:1;margin-bottom:8px;}
.ac-sub{font-size:16px;color:var(--stone);font-weight:300;margin-bottom:40px;line-height:1.5;}
.ac-input{width:100%;background:var(--dark);border:1px solid var(--lineb);color:var(--bone);padding:14px 16px;font-family:'Barlow Condensed',sans-serif;font-size:16px;outline:none;transition:border-color .2s;box-sizing:border-box;}
.ac-input:focus{border-color:var(--blue);}
.ac-btn{width:100%;background:var(--bone);color:var(--black);border:none;font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:.15em;padding:18px;cursor:pointer;transition:background .2s;margin-top:12px;}
.ac-btn:hover:not(:disabled){background:#fff;}
.ac-btn:disabled{background:var(--stone);cursor:wait;}
.ac-btn-ghost{width:100%;background:transparent;color:var(--stone);border:1px solid var(--lineb);font-family:'Barlow Condensed',sans-serif;font-size:14px;letter-spacing:2px;text-transform:uppercase;padding:12px;cursor:pointer;margin-top:8px;transition:border-color .2s,color .2s;}
.ac-btn-ghost:hover{border-color:var(--bone);color:var(--bone);}
.ac-err{font-size:14px;color:#e05c5c;margin-top:12px;padding:12px 16px;border:1px solid rgba(224,92,92,0.3);}
.ac-panel{border:1px solid var(--lineb);margin-bottom:16px;}
.ac-panel-head{padding:20px 24px;border-bottom:1px solid var(--lineb);display:flex;align-items:center;justify-content:space-between;}
.ac-panel-label{font-size:11px;letter-spacing:5px;text-transform:uppercase;color:var(--blit);font-weight:600;}
.ac-panel-body{padding:24px;}
.ac-field-label{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);font-weight:600;margin-bottom:6px;}
.ac-field-value{font-size:16px;color:var(--bone);font-weight:300;margin-bottom:16px;line-height:1.5;}
.ac-badge{display:inline-block;font-size:10px;letter-spacing:3px;text-transform:uppercase;font-weight:700;padding:4px 10px;}
.ac-badge-active{background:rgba(74,143,199,0.15);color:#4A8FC7;}
.ac-badge-cancelling{background:rgba(200,149,42,0.12);color:#c8952a;}
.ac-badge-cancelled{background:rgba(168,180,188,0.1);color:var(--stone);}
.ac-badge-paused{background:rgba(168,180,188,0.1);color:var(--stone);}
.ac-badge-past_due{background:rgba(224,92,92,0.12);color:#e05c5c;}
.ac-addr-empty{font-size:15px;color:var(--stone);font-weight:300;font-style:italic;}
.ac-confirm-box{background:rgba(224,92,92,0.05);border:1px solid rgba(224,92,92,0.2);padding:20px;margin-top:16px;}
.ac-confirm-text{font-size:15px;color:var(--mist);line-height:1.6;margin-bottom:16px;}
.ac-btn-danger{background:#c0392b;color:#fff;border:none;font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:.1em;padding:14px 24px;cursor:pointer;margin-right:12px;}
.ac-form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.ac-form-field{display:flex;flex-direction:column;gap:6px;margin-bottom:14px;}
.ac-form-label{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);font-weight:600;}
.ac-form-input{background:var(--dark);border:1px solid var(--lineb);color:var(--bone);padding:12px 14px;font-family:'Barlow Condensed',sans-serif;font-size:15px;outline:none;}
.ac-form-input:focus{border-color:var(--blue);}
.ac-signout{font-size:12px;letter-spacing:2px;text-transform:uppercase;color:var(--stone);background:none;border:none;cursor:pointer;padding:0;margin-top:24px;}
.ac-signout:hover{color:var(--bone);}
.ac-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:40px;}
@media(max-width:480px){.ac-form-row{grid-template-columns:1fr;}}
`;

function LoadingView() {
  return (
    <div className="ac-page">
      <style>{CSS}</style>
      <div className="ac-wrap">
        <a href="/" className="ac-logo">SOLUM</a>
        <div style={{color:'var(--stone)',fontSize:14,letterSpacing:2,textTransform:'uppercase'}}>Loading…</div>
      </div>
    </div>
  );
}

function LoginView({ phase, setPhase }) {
  const [email, setEmail]     = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState('');

  async function handleSend(e) {
    e.preventDefault();
    setError('');
    setSending(true);
    // Always normalise email to lowercase to match stored customer records
    const normalisedEmail = email.trim().toLowerCase();
    try {
      const checkRes = await fetch(`${SUPABASE_URL}/functions/v1/check-customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
        body: JSON.stringify({ email: normalisedEmail }),
      });
      const { exists } = await checkRes.json();
      if (!exists) {
        setError('No account found for this email. If you think this is wrong, email contact@bysolum.co.uk.');
        setSending(false);
        return;
      }
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: normalisedEmail,
        options: { emailRedirectTo: `${window.location.origin}/account` },
      });
      if (otpError) throw otpError;
      setPhase('sent');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  }

  if (phase === 'sent') {
    return (
      <div className="ac-page">
        <style>{CSS}</style>
        <div className="ac-wrap">
          <a href="/" className="ac-logo">SOLUM</a>
          <div className="ac-heading">Check Your Email.</div>
          <div className="ac-sub">
            We've sent a login link to <strong style={{color:'var(--bone)'}}>{email.trim().toLowerCase()}</strong>.<br />
            Click it to access your account. The link expires in 1 hour.
          </div>
          <button className="ac-btn-ghost" onClick={() => setPhase('login')} style={{marginTop:0}}>
            ← Wrong email? Go back
          </button>
          <div style={{marginTop:16}}>
            <a href="/" style={{fontSize:12,letterSpacing:3,textTransform:'uppercase',color:'var(--stone)',textDecoration:'none'}}>← Back to home</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ac-page">
      <style>{CSS}</style>
      <div className="ac-wrap">
        <a href="/" style={{fontSize:12,letterSpacing:3,textTransform:'uppercase',color:'var(--stone)',textDecoration:'none',display:'inline-block',marginBottom:40}}>← Back to home</a>
        <div className="ac-heading">Your Account.</div>
        <div className="ac-sub">Enter your email and we'll send you a login link. No password needed.</div>
        <form onSubmit={handleSend}>
          <input
            className="ac-input"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          {error && <div className="ac-err">{error}</div>}
          <button className="ac-btn" type="submit" disabled={sending || !email}>
            {sending ? 'Sending…' : 'Send Login Link'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Dashboard({ session, customer, sub, address, setAddress, setSub, setCustomer, setPhase }) {
  const [editingAddress, setEditingAddress] = useState(false);
  const [addrForm, setAddrForm]             = useState({ name: '', line1: '', line2: '', city: '', postcode: '' });
  const [addrSaving, setAddrSaving]         = useState(false);
  const [addrError, setAddrError]           = useState('');

  const [editingName, setEditingName] = useState(false);
  const [nameForm, setNameForm]       = useState({ first_name: '', last_name: '' });
  const [nameSaving, setNameSaving]   = useState(false);
  const [nameError, setNameError]     = useState('');

  function startEditName() {
    setNameForm({ first_name: customer?.first_name ?? '', last_name: customer?.last_name ?? '' });
    setNameError('');
    setEditingName(true);
  }

  async function saveName(e) {
    e.preventDefault();
    if (!nameForm.first_name.trim()) { setNameError('First name is required.'); return; }
    setNameSaving(true);
    setNameError('');
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/update-customer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nameForm),
      });
      if (!res.ok) throw new Error('Failed to save name');
      const updated = await res.json();
      setCustomer(c => ({ ...c, first_name: updated.first_name, last_name: updated.last_name }));
      setEditingName(false);
    } catch (err) {
      setNameError(err.message);
    } finally {
      setNameSaving(false);
    }
  }
  const [confirmCancel, setConfirmCancel]   = useState(false);
  const [cancelling, setCancelling]         = useState(false);
  // Initialise from sub.cancel_at so returning visitors see the correct date
  const [cancelledUntil, setCancelledUntil] = useState(sub?.cancel_at ?? null);

  function startEditAddress() {
    setAddrForm({
      name:     address?.name ?? [customer?.first_name, customer?.last_name].filter(Boolean).join(' '),
      line1:    address?.line1    ?? '',
      line2:    address?.line2    ?? '',
      city:     address?.city     ?? '',
      postcode: address?.postcode ?? '',
    });
    setAddrError('');
    setEditingAddress(true);
  }

  async function saveAddress(e) {
    e.preventDefault();
    setAddrSaving(true);
    setAddrError('');
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/update-address`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(addrForm),
      });
      if (!res.ok) throw new Error('Failed to save address');
      const updated = await res.json();
      setAddress(updated);
      setEditingAddress(false);
    } catch (err) {
      setAddrError(err.message);
    } finally {
      setAddrSaving(false);
    }
  }

  async function cancelSubscription() {
    setCancelling(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/cancel-subscription`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error('Failed to cancel');
      const { cancel_at } = await res.json();
      setSub(s => ({ ...s, status: 'cancelling', cancel_at }));
      setCancelledUntil(cancel_at);
      setConfirmCancel(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setCancelling(false);
    }
  }

  const statusBadge = {
    active:     { label: 'Active',     cls: 'ac-badge-active'     },
    cancelling: { label: 'Cancelling', cls: 'ac-badge-cancelling' },
    cancelled:  { label: 'Cancelled',  cls: 'ac-badge-cancelled'  },
    paused:     { label: 'Paused',     cls: 'ac-badge-paused'     },
    past_due:   { label: 'Past Due',   cls: 'ac-badge-past_due'   },
  }[sub?.status] ?? { label: sub?.status ?? '—', cls: '' };

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  const nextBillingDate = formatDate(sub?.current_period_end);
  const cancelDate      = formatDate(cancelledUntil ?? sub?.cancel_at);

  return (
    <div className="ac-page">
      <style>{CSS}</style>
      <div className="ac-wrap">

        <div className="ac-header">
          <a href="/" className="ac-logo" style={{marginBottom:0}}>SOLUM</a>
          <button className="ac-signout" onClick={() => { setPhase('login'); supabase.auth.signOut(); }}>Sign out</button>
        </div>

        <div className="ac-heading" style={{marginBottom:4}}>Your Account.</div>
        <div className="ac-sub" style={{marginBottom:32}}>Hello, {customer?.first_name ?? 'there'}.</div>

        {/* Panel 0 — Personal Details */}
        <div className="ac-panel">
          <div className="ac-panel-head">
            <span className="ac-panel-label">Personal Details</span>
            {!editingName && (
              <button
                className="ac-btn-ghost"
                style={{width:'auto',padding:'6px 16px',marginTop:0,fontSize:11,letterSpacing:3}}
                onClick={startEditName}
              >
                Edit
              </button>
            )}
          </div>
          <div className="ac-panel-body">
            {!editingName ? (
              <>
                <div className="ac-field-label">Name</div>
                <div className="ac-field-value">{[customer?.first_name, customer?.last_name].filter(Boolean).join(' ') || '—'}</div>
                <div className="ac-field-label">Email</div>
                <div className="ac-field-value" style={{marginBottom:0}}>{customer?.email ?? '—'}</div>
              </>
            ) : (
              <form onSubmit={saveName}>
                <div className="ac-form-row">
                  <div className="ac-form-field">
                    <label className="ac-form-label">First name</label>
                    <input className="ac-form-input" value={nameForm.first_name} onChange={e => setNameForm(f => ({...f, first_name: e.target.value}))} required />
                  </div>
                  <div className="ac-form-field">
                    <label className="ac-form-label">Last name</label>
                    <input className="ac-form-input" value={nameForm.last_name} onChange={e => setNameForm(f => ({...f, last_name: e.target.value}))} />
                  </div>
                </div>
                {nameError && <div className="ac-err">{nameError}</div>}
                <button className="ac-btn" type="submit" disabled={nameSaving}>{nameSaving ? 'Saving…' : 'Save'}</button>
                <button className="ac-btn-ghost" type="button" onClick={() => setEditingName(false)}>Cancel</button>
              </form>
            )}
          </div>
        </div>

        {/* Panel 1 — Subscription */}
        <div className="ac-panel">
          <div className="ac-panel-head">
            <span className="ac-panel-label">Subscription</span>
            <span className={`ac-badge ${statusBadge.cls}`}>{statusBadge.label}</span>
          </div>
          <div className="ac-panel-body">
            <div className="ac-field-label">Kit</div>
            <div className="ac-field-value">{sub?.kit_id?.toUpperCase() ?? '—'}</div>

            {sub?.status === 'active' && (
              <>
                <div className="ac-field-label">Next billing date</div>
                <div className="ac-field-value">{nextBillingDate}</div>
              </>
            )}
            {sub?.status === 'cancelling' && (
              <div style={{fontSize:14,color:'#c8952a',lineHeight:1.6}}>
                Your subscription is set to cancel on {cancelDate}. No further boxes will be sent after that date.
              </div>
            )}
            {sub?.status === 'past_due' && (
              <div style={{fontSize:14,color:'#e05c5c',lineHeight:1.6}}>
                Your last payment failed. Email us at <a href="mailto:contact@bysolum.co.uk" style={{color:'#e05c5c'}}>contact@bysolum.co.uk</a> and we'll send you a secure link to update your payment method.
              </div>
            )}
            <div className="ac-field-label" style={{marginTop:sub?.status === 'active' ? 0 : 16}}>Months active</div>
            <div className="ac-field-value" style={{marginBottom:0}}>{sub?.months_active ?? 0}</div>
          </div>
        </div>

        {/* Panel 2 — Address */}
        <div className="ac-panel">
          <div className="ac-panel-head">
            <span className="ac-panel-label">Shipping Address</span>
            {!editingAddress && (
              <button
                className="ac-btn-ghost"
                style={{width:'auto',padding:'6px 16px',marginTop:0,fontSize:11,letterSpacing:3}}
                onClick={startEditAddress}
              >
                {address ? 'Update' : 'Add'}
              </button>
            )}
          </div>
          <div className="ac-panel-body">
            {!editingAddress && (
              address ? (
                <div className="ac-field-value" style={{marginBottom:0}}>
                  {address.name}<br />
                  {address.line1}{address.line2 ? `, ${address.line2}` : ''}<br />
                  {address.city}<br />
                  {address.postcode}<br />
                  United Kingdom
                </div>
              ) : (
                <div className="ac-addr-empty">No shipping address on file — please add one.</div>
              )
            )}

            {editingAddress && (
              <form onSubmit={saveAddress}>
                <div className="ac-form-field">
                  <label className="ac-form-label">Full name</label>
                  <input className="ac-form-input" value={addrForm.name} onChange={e => setAddrForm(f => ({...f, name: e.target.value}))} required />
                </div>
                <div className="ac-form-field">
                  <label className="ac-form-label">Address line 1</label>
                  <input className="ac-form-input" value={addrForm.line1} onChange={e => setAddrForm(f => ({...f, line1: e.target.value}))} required />
                </div>
                <div className="ac-form-field">
                  <label className="ac-form-label">Address line 2 (optional)</label>
                  <input className="ac-form-input" value={addrForm.line2} onChange={e => setAddrForm(f => ({...f, line2: e.target.value}))} />
                </div>
                <div className="ac-form-row">
                  <div className="ac-form-field">
                    <label className="ac-form-label">City</label>
                    <input className="ac-form-input" value={addrForm.city} onChange={e => setAddrForm(f => ({...f, city: e.target.value}))} required />
                  </div>
                  <div className="ac-form-field">
                    <label className="ac-form-label">Postcode</label>
                    <input className="ac-form-input" value={addrForm.postcode} onChange={e => setAddrForm(f => ({...f, postcode: e.target.value}))} required />
                  </div>
                </div>
                <div className="ac-form-field" style={{marginBottom:16}}>
                  <label className="ac-form-label">Country</label>
                  <div style={{fontSize:15,color:'var(--stone)',padding:'12px 0'}}>United Kingdom</div>
                </div>
                {addrError && <div className="ac-err">{addrError}</div>}
                <button className="ac-btn" type="submit" disabled={addrSaving}>{addrSaving ? 'Saving…' : 'Save Address'}</button>
                <button className="ac-btn-ghost" type="button" onClick={() => setEditingAddress(false)}>Cancel</button>
              </form>
            )}
          </div>
        </div>

        {/* Panel 3 — Cancel (only if active or cancelling) */}
        {(sub?.status === 'active' || sub?.status === 'cancelling') && (
          <div className="ac-panel">
            <div className="ac-panel-head">
              <span className="ac-panel-label">Cancel Subscription</span>
            </div>
            <div className="ac-panel-body">
              {sub.status === 'cancelling' ? (
                <div style={{fontSize:15,color:'var(--stone)',fontWeight:300}}>
                  Your cancellation is already scheduled for {cancelDate}.
                </div>
              ) : (
                <>
                  <div style={{fontSize:15,color:'var(--stone)',fontWeight:300,lineHeight:1.6,marginBottom:16}}>
                    You can cancel at any time. Your subscription will remain active until the end of the current billing period.
                  </div>
                  {!confirmCancel && (
                    <button
                      className="ac-btn-ghost"
                      style={{width:'auto',padding:'10px 20px',color:'#e05c5c',borderColor:'rgba(224,92,92,0.3)'}}
                      onClick={() => setConfirmCancel(true)}
                    >
                      Cancel subscription
                    </button>
                  )}
                  {confirmCancel && (
                    <div className="ac-confirm-box">
                      <div className="ac-confirm-text">
                        Your subscription will remain active until <strong>{nextBillingDate}</strong>. After that, no further boxes will be sent.
                      </div>
                      <button className="ac-btn-danger" onClick={cancelSubscription} disabled={cancelling}>
                        {cancelling ? 'Cancelling…' : 'Yes, cancel'}
                      </button>
                      <button
                        className="ac-btn-ghost"
                        style={{width:'auto',padding:'10px 20px'}}
                        onClick={() => setConfirmCancel(false)}
                      >
                        Keep my subscription
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function AccountPage() {
  const [phase, setPhase]       = useState('loading');
  const [session, setSession]   = useState(null);
  const [customer, setCustomer] = useState(null);
  const [sub, setSub]           = useState(null);
  const [address, setAddress]   = useState(null);

  useEffect(() => {
    // Use onAuthStateChange as the single source of truth for session state.
    // INITIAL_SESSION fires immediately with the existing session (or null),
    // avoiding a double fetch that getSession() + onAuthStateChange would cause.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setSession(session);
        // Only load data on genuine auth events, not every re-render
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          loadCustomerData(session);
        }
      } else {
        setSession(null);
        setCustomer(null);
        setSub(null);
        setAddress(null);
        setPhase('login');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadCustomerData(session) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/get-account`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (!res.ok) { setPhase('login'); return; }
      const { customer, subscription, address } = await res.json();
      if (!customer) { setPhase('login'); return; }
      setCustomer(customer);
      setSub(subscription);
      setAddress(address);
      setPhase('dashboard');
    } catch {
      setPhase('login');
    }
  }

  if (phase === 'loading')                    return <LoadingView />;
  if (phase === 'login' || phase === 'sent')  return <LoginView phase={phase} setPhase={setPhase} />;
  return (
    <Dashboard
      session={session}
      customer={customer}
      sub={sub}
      address={address}
      setAddress={setAddress}
      setSub={setSub}
      setCustomer={setCustomer}
      setPhase={setPhase}
    />
  );
}
