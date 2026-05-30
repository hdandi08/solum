import { useState, useEffect } from 'react'
import { useEnv } from '../context/EnvContext'

const KIT_MRR = { ground: 3800, ritual: 4800, sovereign: 5800 }

function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
function pence(p) { return `£${((p || 0) / 100).toFixed(2)}` }

function Label({ children }) {
  return (
    <div style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bone-muted)', fontWeight: 600, marginBottom: 10, marginTop: 24 }}>
      {children}
    </div>
  )
}

function SubStatusBadge({ status }) {
  const map = {
    active:    { cls: 'ok',       label: 'Active' },
    past_due:  { cls: 'low',      label: 'Past Due' },
    unpaid:    { cls: 'critical', label: 'Unpaid' },
    cancelled: { cls: 'no-data',  label: 'Cancelled' },
  }
  const { cls, label } = map[status] || { cls: 'no-data', label: status }
  return <span className={`risk-badge ${cls}`}>{label}</span>
}

function IssueTypeBadge({ type }) {
  const map = {
    all_retries_failed: { cls: 'critical', label: 'All Retries Failed' },
    disputed:           { cls: 'critical', label: 'Disputed' },
    bank_block:         { cls: 'low',      label: 'Bank Block' },
  }
  const { cls, label } = map[type] || { cls: 'no-data', label: type }
  return <span className={`risk-badge ${cls}`}>{label}</span>
}

export default function CustomerPanel({ customerId, onClose }) {
  const { config } = useEnv()
  const [data, setData]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [cancelling, setCancelling]   = useState(false)
  const [cancelConfirm, setCancelConfirm] = useState(false)

  useEffect(() => {
    if (!customerId) return
    setLoading(true)
    setError('')
    setData(null)
    setCancelConfirm(false)

    async function load() {
      try {
        const [
          { data: customer, error: e1 },
          { data: subscription, error: e2 },
          { data: addresses, error: e3 },
          { data: orders, error: e4 },
          { data: attempts, error: e5 },
          { data: issues, error: e6 },
        ] = await Promise.all([
          config.client.from('customers').select('*').eq('id', customerId).single(),
          config.client.from('subscriptions').select('*').eq('customer_id', customerId).eq('status', 'active').maybeSingle(),
          config.client.from('addresses').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }),
          config.client.from('orders').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }),
          config.client.from('payment_attempts').select('*').eq('customer_id', customerId).order('attempted_at', { ascending: false }).limit(15),
          config.client.from('payment_issues').select('*').eq('customer_id', customerId).eq('resolved', false).order('created_at', { ascending: false }),
        ])
        const err = e1 || e2 || e3 || e4 || e5 || e6
        if (err) throw err
        setData({ customer, subscription, addresses: addresses || [], orders: orders || [], attempts: attempts || [], issues: issues || [] })
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [customerId, config])

  async function handleCancel() {
    if (!data?.subscription) return
    setCancelling(true)
    try {
      const { error: err } = await config.client.from('subscriptions').update({
        status: 'cancelled',
        payment_status: 'cancelled',
        cancelled_reason: 'admin_cancelled',
      }).eq('id', data.subscription.id)
      if (err) throw err
      setData(d => ({ ...d, subscription: { ...d.subscription, status: 'cancelled', payment_status: 'cancelled', cancelled_reason: 'admin_cancelled' } }))
      setCancelConfirm(false)
    } catch (err) {
      alert(err.message)
    } finally {
      setCancelling(false)
    }
  }

  const address = data?.addresses.find(a => a.is_current) || data?.addresses[0] || null
  const sub     = data?.subscription

  return (
    <>
      <div className="panel-backdrop" onClick={onClose} />
      <div className="panel">
        <div className="panel-header">
          <button className="panel-close" onClick={onClose} aria-label="Close">×</button>

          {loading ? (
            <div style={{ padding: '8px 0', color: 'var(--bone-muted)', fontSize: 13 }}>Loading...</div>
          ) : error ? (
            <div style={{ padding: '8px 0', color: 'var(--critical)', fontSize: 13 }}>{error}</div>
          ) : data?.customer ? (
            <div className="panel-identity">
              <div className="panel-name">
                {[data.customer.first_name, data.customer.last_name].filter(Boolean).join(' ') || '—'}
              </div>
              <div className="panel-email">{data.customer.email}</div>
              {address?.phone && (
                <div style={{ fontSize: 13, color: 'var(--sky-blue)', marginTop: 4 }}>{address.phone}</div>
              )}
              <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {sub && (
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--sky-blue)', background: 'rgba(74,143,199,0.15)', padding: '3px 8px', borderRadius: 3 }}>
                    {sub.kit_id}
                  </span>
                )}
                <span style={{ fontSize: 12, color: 'var(--bone-muted)' }}>Joined {fmt(data.customer.created_at)}</span>
              </div>
            </div>
          ) : null}
        </div>

        {!loading && !error && data && (
          <div className="panel-body">

            {/* Address */}
            <Label>Shipping Address</Label>
            {address ? (
              <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                <div style={{ fontWeight: 500 }}>{address.name}</div>
                <div style={{ color: 'var(--bone-dim)' }}>{address.line1}{address.line2 ? `, ${address.line2}` : ''}</div>
                <div style={{ color: 'var(--bone-dim)' }}>{address.city}, {address.postcode}</div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--bone-muted)' }}>No address on file</div>
            )}

            {/* Subscription */}
            <Label>Subscription</Label>
            {sub ? (
              <div className="card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', fontSize: 13 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--bone-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Kit</div>
                    <div style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--sky-blue)' }}>{sub.kit_id}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--bone-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Payment</div>
                    <SubStatusBadge status={sub.payment_status} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--bone-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>MRR</div>
                    <div style={{ fontWeight: 600 }}>{pence(KIT_MRR[sub.kit_id] || 0)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--bone-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Months Active</div>
                    <div style={{ fontWeight: 600 }}>{sub.months_active ?? 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--bone-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Next Due</div>
                    <div>{fmt(sub.next_payment_due)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--bone-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Failures</div>
                    <div style={{ fontWeight: 700, color: sub.consecutive_failures > 0 ? 'var(--critical)' : 'var(--bone-muted)' }}>
                      {sub.consecutive_failures || 0}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  {sub.status === 'cancelled' ? (
                    <div style={{ fontSize: 12, color: 'var(--bone-muted)' }}>
                      Cancelled — reason: {sub.cancelled_reason || '—'}
                    </div>
                  ) : cancelConfirm ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: 'var(--bone-dim)', flex: 1 }}>Cancel this subscription?</span>
                      <button className="btn btn-sm btn-danger" onClick={handleCancel} disabled={cancelling}>
                        {cancelling ? '...' : 'Yes, Cancel'}
                      </button>
                      <button className="btn btn-sm btn-secondary" onClick={() => setCancelConfirm(false)}>No</button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-sm"
                      style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--bone-muted)', fontSize: 12 }}
                      onClick={() => setCancelConfirm(true)}
                    >
                      Cancel Subscription
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--bone-muted)' }}>No active subscription</div>
            )}

            {/* Open Issues */}
            {data.issues.length > 0 && (
              <>
                <Label>Open Payment Issues</Label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {data.issues.map(issue => (
                    <div key={issue.id} className="card" style={{ padding: '12px 16px', borderColor: 'rgba(200,92,92,0.4)', display: 'flex', gap: 12, alignItems: 'center' }}>
                      <IssueTypeBadge type={issue.issue_type} />
                      <span style={{ fontSize: 12, color: 'var(--bone-muted)', flex: 1 }}>{fmtTime(issue.created_at)}</span>
                      {issue.last_failure_code && (
                        <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--critical)' }}>{issue.last_failure_code}</span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Orders */}
            <Label>Orders ({data.orders.length})</Label>
            {data.orders.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--bone-muted)' }}>No orders</div>
            ) : (
              <div>
                {data.orders.map(order => (
                  <div key={order.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span style={{ color: 'var(--bone-muted)', whiteSpace: 'nowrap', minWidth: 80 }}>{fmt(order.created_at)}</span>
                    <span style={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--sky-blue)', minWidth: 64 }}>{order.kit_id}</span>
                    <span style={{ fontSize: 11, color: 'var(--bone-muted)', flex: 1 }}>
                      {order.order_type === 'first_box' ? 'First Box' : `Refill #${order.box_number || ''}`}
                    </span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{pence(order.amount_pence)}</span>
                    <span className={`risk-badge ${order.dispatch_status === 'pending' ? 'low' : 'ok'}`} style={{ fontSize: 11 }}>
                      {order.dispatch_status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Payment Attempts */}
            <Label>Recent Payments</Label>
            {data.attempts.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--bone-muted)' }}>No payment attempts</div>
            ) : (
              <div>
                {data.attempts.map(a => (
                  <div key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span style={{ color: 'var(--bone-muted)', whiteSpace: 'nowrap', minWidth: 110, fontSize: 12 }}>{fmtTime(a.attempted_at)}</span>
                    <span className={`risk-badge ${a.status === 'succeeded' ? 'ok' : 'critical'}`} style={{ fontSize: 11 }}>{a.status}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', marginLeft: 'auto' }}>{pence(a.amount_pence)}</span>
                    {a.failure_code && (
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--critical)' }}>{a.failure_code}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

          </div>
        )}
      </div>
    </>
  )
}
