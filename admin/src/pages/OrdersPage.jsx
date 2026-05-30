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

// ── Box code system ────────────────────────────────────────────────────────

const PRODUCT_NAMES = {
  '01': 'Body Wash',
  '02': 'Italy Towel Mitt',
  '03': 'Back Scrub Cloth',
  '04': 'Scalp Massager',
  '05': 'Atlas Clay',
  '06': 'Body Oil',
  '07': 'Body Lotion',
  '08': 'Cleansing Cloth',
  '11': 'Clay Mixing Bowl',
}

const BOX_MANIFESTS = {
  GS:  { label: 'GROUND Starter',            products: ['01','02','03','04','05','07','08'] },
  RS:  { label: 'RITUAL Starter',             products: ['01','02','03','04','05','06','07','08','11'] },
  GR:  { label: 'GROUND Refill',              products: ['01','02','05','07','08'] },
  RR:  { label: 'RITUAL Refill',              products: ['01','02','05','06','07','08'] },
  GR3: { label: 'GROUND Refill + Back Cloth', products: ['01','02','03','05','07','08'] },
  RR3: { label: 'RITUAL Refill + Back Cloth', products: ['01','02','03','05','06','07','08'] },
  GR6: { label: 'GROUND Refill + Scalp',      products: ['01','02','04','05','07','08'] },
  RR6: { label: 'RITUAL Refill + Scalp',      products: ['01','02','04','05','06','07','08'] },
}

function getBoxCode(order) {
  const kit = order.kit_id === 'ritual' ? 'R' : 'G'
  if (order.order_type === 'first_box') return `${kit}S`
  const box = order.box_number ?? 1
  if (box === 3) return `${kit}R3`
  if (box === 6) return `${kit}R6`
  return `${kit}R`
}

// ── Dispatch window ────────────────────────────────────────────────────────
// Thu (cutoff Wed 12pm) · Mon (cutoff Sun 12pm)

function getDispatchWindow(fromDate) {
  const d = new Date(fromDate)
  const day = d.getDay()
  const isBeforeNoon = d.getHours() < 12
  const result = new Date(d)
  result.setHours(0, 0, 0, 0)
  const daysToAdd = { 1: 3, 2: 2, 4: 4, 5: 3, 6: 2 }
  if (day in daysToAdd) {
    result.setDate(result.getDate() + daysToAdd[day])
  } else if (day === 3) {
    result.setDate(result.getDate() + (isBeforeNoon ? 1 : 5))
  } else {
    result.setDate(result.getDate() + (isBeforeNoon ? 1 : 4))
  }
  return result
}

function fmtDispatch(date) {
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getCarrier(value) { return CARRIERS.find(c => c.value === value) || CARRIERS[0] }

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

function BatchSummary({ batches }) {
  if (!batches.length) return null
  const now = new Date()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
      {batches.map(batch => {
        const isOverdue = new Date(batch.dateKey) < now
        return (
          <div key={batch.dateKey} className="card" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 100 }}>
              {isOverdue && <div style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--critical)', marginBottom: 2 }}>Overdue</div>}
              <div style={{ fontWeight: 600, fontSize: 15, color: isOverdue ? 'var(--critical)' : 'var(--bone)' }}>{batch.dateLabel}</div>
            </div>
            <div style={{ minWidth: 60 }}>
              <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--bone-muted)', marginBottom: 2 }}>Boxes</div>
              <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--sky-blue)' }}>{batch.total}</div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              {Object.entries(batch.codes).sort().map(([code, count]) => (
                <span key={code} style={{
                  fontSize: 13, fontFamily: 'monospace', fontWeight: 600,
                  background: 'rgba(74,143,199,0.1)', border: '1px solid rgba(74,143,199,0.25)',
                  padding: '3px 10px', color: 'var(--sky-blue)',
                }}>
                  {count}× {code}
                </span>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function OrdersPage() {
  const { config } = useEnv()
  const [orders, setOrders]             = useState([])
  const [batches, setBatches]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')
  const [page, setPage]                 = useState(0)
  const [total, setTotal]               = useState(0)
  const [typeFilter, setTypeFilter]     = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [expanded, setExpanded]         = useState({})
  const [inputs, setInputs]             = useState({})
  const [saving, setSaving]             = useState(null)
  const [saveError, setSaveError]       = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)

  const fetchBatches = useCallback(async () => {
    try {
      const { data } = await config.client
        .from('orders')
        .select('kit_id, order_type, box_number, created_at')
        .eq('dispatch_status', 'pending')
      if (!data) return
      const map = {}
      for (const o of data) {
        const code = getBoxCode(o)
        const win  = getDispatchWindow(o.created_at)
        const key  = win.toISOString().slice(0, 10)
        if (!map[key]) map[key] = { dateKey: key, dateLabel: fmtDispatch(win), total: 0, codes: {} }
        map[key].total++
        map[key].codes[code] = (map[key].codes[code] || 0) + 1
      }
      setBatches(Object.values(map).sort((a, b) => a.dateKey.localeCompare(b.dateKey)))
    } catch { /* non-critical */ }
  }, [config])

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
      const rows = (data || []).map(o => ({
        ...o,
        address:    (o.customers?.addresses || []).find(a => a.is_current) || o.customers?.addresses?.[0] || null,
        boxCode:    getBoxCode(o),
        dispatchBy: getDispatchWindow(o.created_at),
      }))
      setOrders(rows)
      setTotal(count || 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [page, typeFilter, statusFilter, config])

  useEffect(() => { fetchBatches() }, [fetchBatches])
  useEffect(() => { fetchOrders() }, [fetchOrders])

  function getInput(id) { return inputs[id] || { tracking: '', carrier: 'royal-mail' } }
  function setInput(id, key, val) { setInputs(p => ({ ...p, [id]: { ...getInput(id), [key]: val } })) }
  function toggleExpand(id) { setExpanded(p => ({ ...p, [id]: !p[id] })) }

  async function handleDispatch(order) {
    const { tracking, carrier } = getInput(order.id)
    setSaving(order.id)
    setSaveError('')
    try {
      const { error: err } = await config.client.from('orders').update({
        dispatch_status: 'dispatched',
        tracking_number: tracking.trim() || null,
        carrier,
        dispatched_at:   new Date().toISOString(),
      }).eq('id', order.id)
      if (err) throw err
      await Promise.all([fetchOrders(), fetchBatches()])
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

      <BatchSummary batches={batches} />

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
                    <th>Box</th>
                    <th>Dispatch By</th>
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
                    const inp        = getInput(order.id)
                    const isExpanded = expanded[order.id]
                    const manifest   = BOX_MANIFESTS[order.boxCode]
                    const isOverdue  = order.dispatch_status === 'pending' && order.dispatchBy < new Date()
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
                          <span
                            title={manifest ? `${manifest.label} · ${manifest.products.map(n => PRODUCT_NAMES[n]).join(', ')}` : order.boxCode}
                            style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--sky-blue)', letterSpacing: '0.05em', cursor: 'help', borderBottom: '1px dashed rgba(74,143,199,0.4)', paddingBottom: 1 }}
                          >
                            {order.boxCode}
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {order.dispatch_status === 'pending' ? (
                            <span style={{ fontSize: 13, fontWeight: 500, color: isOverdue ? 'var(--critical)' : 'var(--bone)' }}>
                              {isOverdue && '⚠ '}{fmtDispatch(order.dispatchBy)}
                            </span>
                          ) : (
                            <span style={{ fontSize: 13, color: 'var(--bone-muted)' }}>{fmt(order.dispatched_at)}</span>
                          )}
                        </td>
                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>£{((order.amount_pence || 0) / 100).toFixed(2)}</td>
                        <td>
                          <span className={`risk-badge ${order.dispatch_status === 'pending' ? (isOverdue ? 'critical' : 'low') : 'ok'}`}>
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
                        <tr key={`${order.id}-detail`} style={{ background: 'var(--surface-hover)' }}>
                          <td colSpan={8} style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
                              <div>
                                <div style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bone-muted)', marginBottom: 8 }}>Ship To</div>
                                <AddressBlock address={order.address} />
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bone-muted)', marginBottom: 8 }}>
                                  Box Contents · <span style={{ color: 'var(--sky-blue)' }}>{order.boxCode}</span>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
                                  {(manifest?.products || []).map(num => (
                                    <span key={num} style={{ fontSize: 13, color: 'var(--bone-dim)' }}>
                                      <span style={{ color: 'var(--sky-blue)', fontFamily: 'monospace', fontWeight: 600, marginRight: 5 }}>{num}</span>
                                      {PRODUCT_NAMES[num] || num}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bone-muted)', marginBottom: 8 }}>Order ID</div>
                                <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--bone-muted)' }}>{order.id.slice(0, 8)}</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ),
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
