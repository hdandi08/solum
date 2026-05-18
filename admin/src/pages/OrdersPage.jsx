import { useState, useEffect, useCallback } from 'react'
import { useEnv } from '../context/EnvContext'
import CustomerPanel from '../components/CustomerPanel'

const PAGE_SIZE = 25

const CARRIERS = [
  { value: 'royal-mail',  label: 'Royal Mail',   url: t => `https://www.royalmail.com/track-your-item#/tracking-results/${t}` },
  { value: 'evri',        label: 'Evri',          url: t => `https://www.evri.com/track-a-parcel/results?trackingNumber=${t}` },
  { value: 'dpd',         label: 'DPD',           url: t => `https://www.dpd.co.uk/service/parcel-tracking/?parcelNumber=${t}` },
  { value: 'dhl',         label: 'DHL',           url: t => `https://www.dhl.com/en/express/tracking.html?AWB=${t}` },
  { value: 'parcelforce', label: 'ParcelForce',   url: t => `https://www.parcelforce.com/track-trace?trackNum=${t}` },
  { value: 'other',       label: 'Other',         url: null },
]

const FITMENT_ID = {
  ground_first_box:    'fitment-ground-first',
  ritual_first_box:    'fitment-ritual-first',
  sovereign_first_box: 'fitment-ritual-first',
  ground_refill:       'fitment-ground-refill',
  ritual_refill:       'fitment-ritual-refill',
  sovereign_refill:    'fitment-ritual-refill',
}

function getCarrier(value) { return CARRIERS.find(c => c.value === value) || CARRIERS[0] }

function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function TrackingLink({ carrier, tracking }) {
  const c = getCarrier(carrier)
  const url = c.url ? c.url(tracking) : null
  return url
    ? <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--sky-blue)', fontFamily: 'monospace' }}>{tracking}</a>
    : <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--bone-muted)' }}>{tracking}</span>
}

function AddressBlock({ address }) {
  if (!address) return <span style={{ fontSize: 12, color: 'var(--bone-muted)' }}>No address on file</span>
  return (
    <div style={{ fontSize: 13, lineHeight: 1.7 }}>
      <div style={{ fontWeight: 500 }}>{address.name}</div>
      <div style={{ color: 'var(--bone-dim)' }}>{address.line1}{address.line2 ? `, ${address.line2}` : ''}</div>
      <div style={{ color: 'var(--bone-dim)' }}>{address.city}, {address.postcode}</div>
      {address.phone && <div style={{ color: 'var(--sky-blue)', fontSize: 12, marginTop: 2 }}>{address.phone}</div>}
    </div>
  )
}

export default function OrdersPage() {
  const { config } = useEnv()
  const [orders, setOrders]             = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')
  const [page, setPage]                 = useState(0)
  const [total, setTotal]               = useState(0)
  const [typeFilter, setTypeFilter]     = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [expanded, setExpanded]         = useState({})

  const [inputs, setInputs]       = useState({})
  const [saving, setSaving]       = useState(null)
  const [saveError, setSaveError] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      let q = config.client
        .from('orders')
        .select(`
          *,
          customers(first_name, last_name, email, addresses(name, line1, line2, city, postcode, phone, is_current))
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      if (typeFilter)   q = q.eq('order_type', typeFilter)
      if (statusFilter) q = q.eq('dispatch_status', statusFilter)
      const { data, count, error: err } = await q
      if (err) throw err
      // Attach only the current address per customer
      const rows = (data || []).map(o => ({
        ...o,
        address: (o.customers?.addresses || []).find(a => a.is_current) || o.customers?.addresses?.[0] || null,
      }))
      setOrders(rows)
      setTotal(count || 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [page, typeFilter, statusFilter, config])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  function getInput(id) { return inputs[id] || { tracking: '', carrier: 'royal-mail' } }
  function setInput(id, key, val) { setInputs(p => ({ ...p, [id]: { ...getInput(id), [key]: val } })) }
  function toggleExpand(id) { setExpanded(p => ({ ...p, [id]: !p[id] })) }

  async function deductBoxAndFitment(order) {
    const fitmentId = FITMENT_ID[`${order.kit_id}_${order.order_type}`]
    const ids = ['box', fitmentId].filter(Boolean)
    const { data: products } = await config.client.from('products').select('id, current_stock').in('id', ids)
    const stockMap = Object.fromEntries((products || []).map(p => [p.id, p.current_stock ?? 0]))
    for (const pid of ids) {
      await config.client.from('products').update({ current_stock: Math.max(0, (stockMap[pid] ?? 0) - 1) }).eq('id', pid)
    }
  }

  async function handleDispatch(order) {
    const { tracking, carrier } = getInput(order.id)
    setSaving(order.id)
    setSaveError('')
    try {
      const { error: err } = await config.client.from('orders').update({
        dispatch_status: 'dispatched',
        tracking_number: tracking.trim() || null,
        carrier,
        dispatched_at: new Date().toISOString(),
      }).eq('id', order.id)
      if (err) throw err
      await deductBoxAndFitment(order)
      await fetchOrders()
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(null)
    }
  }

  async function handleMarkDelivered(orderId) {
    setSaving(orderId)
    setSaveError('')
    try {
      const { error: err } = await config.client.from('orders').update({ dispatch_status: 'delivered' }).eq('id', orderId)
      if (err) throw err
      await fetchOrders()
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(null)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <h1 className="page-title">Orders</h1>

      <div className="filters-bar" style={{ marginBottom: 24 }}>
        <div className="form-group">
          <label className="form-label">Type</label>
          <select className="select" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(0) }}>
            <option value="">All Types</option>
            <option value="first_box">First Box</option>
            <option value="refill">Refill</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Dispatch Status</label>
          <select className="select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0) }}>
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="dispatched">Dispatched</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => { setTypeFilter(''); setStatusFilter(''); setPage(0) }}>Clear</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', marginLeft: 'auto', fontSize: 13, color: 'var(--bone-muted)' }}>
          {total} orders
        </div>
      </div>

      {saveError && <div className="error-state" style={{ marginBottom: 16 }}>{saveError}</div>}

      {loading ? (
        <div className="loading-state"><div className="loading-spinner" />Loading orders...</div>
      ) : error ? (
        <div className="error-state">{error}</div>
      ) : (
        <>
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Kit / Type</th>
                    <th>Box #</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Carrier + Tracking</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan={8} className="no-data">No orders found.</td></tr>
                  ) : orders.map(order => {
                    const inp = getInput(order.id)
                    const isExpanded = expanded[order.id]
                    return [
                      <tr key={order.id} style={{ cursor: 'pointer' }} onClick={() => toggleExpand(order.id)}>
                        <td style={{ fontSize: 13, color: 'var(--bone-muted)', whiteSpace: 'nowrap' }}>{fmt(order.created_at)}</td>
                        <td>
                          <button className="customer-link" onClick={e => { e.stopPropagation(); setSelectedCustomerId(order.customer_id) }}>
                            <div className="customer-link-name" style={{ fontWeight: 500 }}>
                              {[order.customers?.first_name, order.customers?.last_name].filter(Boolean).join(' ') || '—'}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--bone-muted)' }}>{order.customers?.email}</div>
                          </button>
                        </td>
                        <td>
                          <div style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 12, fontWeight: 600, color: 'var(--sky-blue)', marginBottom: 3 }}>{order.kit_id}</div>
                          <span className={`type-badge ${order.order_type === 'first_box' ? 'inbound' : 'outbound_order'}`}>
                            {order.order_type === 'first_box' ? 'First Box' : 'Refill'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--bone-muted)', fontSize: 13 }}>{order.box_number ?? '—'}</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>£{((order.amount_pence || 0) / 100).toFixed(2)}</td>
                        <td>
                          <span className={`risk-badge ${order.dispatch_status === 'pending' ? 'low' : 'ok'}`}>
                            {order.dispatch_status}
                          </span>
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          {order.dispatch_status === 'pending' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <select className="select" style={{ fontSize: 12, padding: '5px 8px' }} value={inp.carrier} onChange={e => setInput(order.id, 'carrier', e.target.value)}>
                                {CARRIERS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                              </select>
                              <input className="input" style={{ fontSize: 12, padding: '5px 8px', width: 140 }} placeholder="Tracking number..." value={inp.tracking} onChange={e => setInput(order.id, 'tracking', e.target.value)} />
                            </div>
                          ) : order.tracking_number ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span style={{ fontSize: 11, color: 'var(--bone-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{getCarrier(order.carrier).label}</span>
                              <TrackingLink carrier={order.carrier} tracking={order.tracking_number} />
                            </div>
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--bone-muted)' }}>No tracking</span>
                          )}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                          {order.dispatch_status === 'pending' && (
                            <button className="btn btn-sm btn-primary" onClick={() => handleDispatch(order)} disabled={saving === order.id}>
                              {saving === order.id ? '...' : 'Dispatch'}
                            </button>
                          )}
                          {order.dispatch_status === 'dispatched' && (
                            <button className="btn btn-sm btn-secondary" onClick={() => handleMarkDelivered(order.id)} disabled={saving === order.id}>
                              {saving === order.id ? '...' : 'Delivered'}
                            </button>
                          )}
                          {order.dispatch_status === 'delivered' && (
                            <span style={{ fontSize: 12, color: 'var(--bone-muted)' }}>{fmt(order.dispatched_at)}</span>
                          )}
                        </td>
                      </tr>,
                      isExpanded && (
                        <tr key={`${order.id}-addr`} style={{ background: 'var(--surface-hover)' }}>
                          <td colSpan={8} style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', gap: 48 }}>
                              <div>
                                <div style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bone-muted)', marginBottom: 8 }}>Ship To</div>
                                <AddressBlock address={order.address} />
                              </div>
                              <div>
                                <div style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bone-muted)', marginBottom: 8 }}>Order ID</div>
                                <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--bone-muted)' }}>{order.id.slice(0, 8)}</span>
                              </div>
                              {order.dispatch_status === 'dispatched' && (
                                <div>
                                  <div style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bone-muted)', marginBottom: 8 }}>Dispatched</div>
                                  <span style={{ fontSize: 13 }}>{fmt(order.dispatched_at)}</span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    ]
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <span className="pagination-info">Page {page + 1} of {totalPages} ({total} orders)</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Prev</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Next</button>
            </div>
          )}
        </>
      )}

      {selectedCustomerId && (
        <CustomerPanel customerId={selectedCustomerId} onClose={() => setSelectedCustomerId(null)} />
      )}
    </div>
  )
}
