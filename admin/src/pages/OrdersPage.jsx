import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const PAGE_SIZE = 25

const CARRIERS = [
  { value: 'royal-mail',  label: 'Royal Mail',   url: (t) => `https://www.royalmail.com/track-your-item#/tracking-results/${t}` },
  { value: 'evri',        label: 'Evri',          url: (t) => `https://www.evri.com/track-a-parcel/results?trackingNumber=${t}` },
  { value: 'dpd',         label: 'DPD',           url: (t) => `https://www.dpd.co.uk/service/parcel-tracking/?parcelNumber=${t}` },
  { value: 'dhl',         label: 'DHL',           url: (t) => `https://www.dhl.com/en/express/tracking.html?AWB=${t}` },
  { value: 'parcelforce', label: 'ParcelForce',   url: (t) => `https://www.parcelforce.com/track-trace?trackNum=${t}` },
  { value: 'other',       label: 'Other',         url: null },
]

const BOX_PRODUCT = {
  first_box: 'box-first-kit',
  refill:    'box-monthly-refill',
}

function getCarrier(value) {
  return CARRIERS.find(c => c.value === value) || CARRIERS[0]
}

function TrackingLink({ carrier, tracking }) {
  const c = getCarrier(carrier)
  const url = c.url ? c.url(tracking) : null
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer"
      style={{ fontSize: '12px', color: 'var(--sky)', fontFamily: 'monospace' }}>
      {tracking}
    </a>
  ) : (
    <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--bone-dim)' }}>{tracking}</span>
  )
}

function DispatchBadge({ status }) {
  const cls = { pending: 'low', dispatched: 'ok', delivered: 'ok' }
  return <span className={`risk-badge ${cls[status] || 'no-data'}`}>{status}</span>
}

function OrderTypeBadge({ type }) {
  return (
    <span className={`type-badge ${type === 'first_box' ? 'inbound' : 'outbound_order'}`}>
      {type === 'first_box' ? 'First Box' : 'Refill'}
    </span>
  )
}

function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function OrdersPage() {
  const [orders, setOrders]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [page, setPage]               = useState(0)
  const [total, setTotal]             = useState(0)
  const [statusFilter, setStatusFilter] = useState('')

  // Per-row dispatch inputs
  const [inputs, setInputs] = useState({}) // { [orderId]: { tracking, carrier } }
  const [saving, setSaving]     = useState(null)
  const [saveError, setSaveError] = useState('')

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      let q = supabase
        .from('orders')
        .select('*, customers(first_name, last_name, email)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      if (statusFilter) q = q.eq('dispatch_status', statusFilter)
      const { data, count, error: err } = await q
      if (err) throw err
      setOrders(data || [])
      setTotal(count || 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  function getInput(orderId) {
    return inputs[orderId] || { tracking: '', carrier: 'royal-mail' }
  }

  function setInput(orderId, key, val) {
    setInputs(p => ({ ...p, [orderId]: { ...getInput(orderId), [key]: val } }))
  }

  async function deductBox(orderType) {
    const productId = BOX_PRODUCT[orderType]
    if (!productId) return
    const { data: product } = await supabase
      .from('products')
      .select('current_stock')
      .eq('id', productId)
      .single()
    if (!product) return
    const newStock = Math.max(0, (product.current_stock ?? 0) - 1)
    await supabase.from('products').update({ current_stock: newStock }).eq('id', productId)
    await supabase.from('inventory_transactions').insert({
      product_id: productId,
      transaction_type: 'outbound_order',
      quantity: -1,
      reference_type: 'dispatch',
      notes: `Dispatched ${orderType === 'first_box' ? 'first kit box' : 'refill mailer'}`,
      created_by: 'admin',
    })
  }

  async function handleDispatch(order) {
    const { tracking, carrier } = getInput(order.id)
    setSaving(order.id)
    setSaveError('')
    try {
      const { error: err } = await supabase
        .from('orders')
        .update({
          dispatch_status: 'dispatched',
          tracking_number: tracking.trim() || null,
          carrier: carrier,
          dispatched_at: new Date().toISOString(),
        })
        .eq('id', order.id)
      if (err) throw err
      await deductBox(order.order_type)
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
      const { error: err } = await supabase
        .from('orders')
        .update({ dispatch_status: 'delivered' })
        .eq('id', orderId)
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

      <div className="filters-bar" style={{ marginBottom: '24px' }}>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="select" value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(0) }}>
            <option value="">All Orders</option>
            <option value="pending">Pending Dispatch</option>
            <option value="dispatched">Dispatched</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => { setStatusFilter(''); setPage(0) }}>Clear</button>
        </div>
      </div>

      {saveError && <div className="error-state" style={{ marginBottom: '16px' }}>{saveError}</div>}

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
                    <th>Kit</th>
                    <th>Type</th>
                    <th>Box #</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Carrier + Tracking</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan={9} className="no-data">No orders found.</td></tr>
                  ) : orders.map(order => {
                    const inp = getInput(order.id)
                    return (
                      <tr key={order.id}>
                        <td style={{ fontSize: '13px', color: 'var(--bone-dim)', whiteSpace: 'nowrap' }}>
                          {fmt(order.created_at)}
                        </td>
                        <td>
                          <div style={{ fontWeight: 500 }}>
                            {[order.customers?.first_name, order.customers?.last_name].filter(Boolean).join(' ') || '—'}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--bone-dim)' }}>{order.customers?.email}</div>
                        </td>
                        <td style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '13px' }}>
                          {order.kit_id || '—'}
                        </td>
                        <td><OrderTypeBadge type={order.order_type} /></td>
                        <td style={{ color: 'var(--bone-dim)', fontSize: '13px' }}>{order.box_number ?? '—'}</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                          £{((order.amount_pence || 0) / 100).toFixed(2)}
                        </td>
                        <td><DispatchBadge status={order.dispatch_status} /></td>
                        <td>
                          {order.dispatch_status === 'pending' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <select
                                className="select"
                                style={{ fontSize: '12px', padding: '5px 8px' }}
                                value={inp.carrier}
                                onChange={e => setInput(order.id, 'carrier', e.target.value)}
                              >
                                {CARRIERS.map(c => (
                                  <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                              </select>
                              <input
                                className="input"
                                style={{ fontSize: '12px', padding: '5px 8px', width: '140px' }}
                                placeholder="Tracking number..."
                                value={inp.tracking}
                                onChange={e => setInput(order.id, 'tracking', e.target.value)}
                              />
                            </div>
                          ) : order.tracking_number ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--bone-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {getCarrier(order.carrier).label}
                              </span>
                              <TrackingLink carrier={order.carrier} tracking={order.tracking_number} />
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--bone-muted)' }}>No tracking</span>
                          )}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {order.dispatch_status === 'pending' && (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => handleDispatch(order)}
                              disabled={saving === order.id}
                            >
                              {saving === order.id ? '...' : 'Dispatch'}
                            </button>
                          )}
                          {order.dispatch_status === 'dispatched' && (
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleMarkDelivered(order.id)}
                              disabled={saving === order.id}
                            >
                              {saving === order.id ? '...' : 'Mark Delivered'}
                            </button>
                          )}
                          {order.dispatch_status === 'delivered' && (
                            <span style={{ fontSize: '12px', color: 'var(--bone-muted)' }}>
                              {fmt(order.dispatched_at)}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
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
    </div>
  )
}
