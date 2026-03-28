import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

const PAGE_SIZE = 25
const ROYAL_MAIL_URL = 'https://www.royalmail.com/track-your-item#/tracking-results/'

function DispatchBadge({ status }) {
  const map = { pending: 'low', dispatched: 'ok', delivered: 'ok' }
  return <span className={`risk-badge ${map[status] || 'no-data'}`}>{status}</span>
}

function OrderTypeBadge({ type }) {
  return (
    <span className={`type-badge ${type === 'first_box' ? 'inbound' : 'outbound_order'}`}>
      {type === 'first_box' ? 'First Box' : 'Refill'}
    </span>
  )
}

function formatDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')

  // Tracking input state per order
  const [trackingInputs, setTrackingInputs] = useState({})
  const [saving, setSaving] = useState(null)
  const [saveError, setSaveError] = useState('')

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      let query = supabase
        .from('orders')
        .select('*, customers(first_name, last_name, email)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (statusFilter) query = query.eq('dispatch_status', statusFilter)

      const { data, count, error: err } = await query
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

  const handleDispatch = async (order) => {
    const tracking = trackingInputs[order.id]?.trim() || null
    setSaving(order.id)
    setSaveError('')
    try {
      const { error: err } = await supabase
        .from('orders')
        .update({
          dispatch_status: 'dispatched',
          tracking_number: tracking,
          dispatched_at: new Date().toISOString(),
        })
        .eq('id', order.id)
      if (err) throw err
      await fetchOrders()
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(null)
    }
  }

  const handleMarkDelivered = async (orderId) => {
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

      {/* Filters */}
      <div className="filters-bar" style={{ marginBottom: '24px' }}>
        <div className="form-group">
          <label className="form-label">Dispatch Status</label>
          <select className="select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0) }}>
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
                    <th>Box</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Tracking</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan={9} className="no-data">No orders found.</td></tr>
                  ) : orders.map(order => (
                    <tr key={order.id}>
                      <td style={{ fontSize: '13px', color: 'var(--bone-dim)', whiteSpace: 'nowrap' }}>
                        {formatDateTime(order.created_at)}
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
                      <td style={{ color: 'var(--bone-dim)', fontSize: '13px' }}>
                        {order.box_number ?? '—'}
                      </td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                        £{((order.amount_pence || 0) / 100).toFixed(2)}
                      </td>
                      <td><DispatchBadge status={order.dispatch_status} /></td>
                      <td>
                        {order.tracking_number ? (
                          <a
                            href={`${ROYAL_MAIL_URL}${order.tracking_number}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '12px', color: 'var(--sky)', fontFamily: 'monospace' }}
                          >
                            {order.tracking_number}
                          </a>
                        ) : order.dispatch_status === 'pending' ? (
                          <input
                            className="input"
                            style={{ fontSize: '12px', padding: '6px 10px', width: '140px' }}
                            placeholder="RM tracking..."
                            value={trackingInputs[order.id] || ''}
                            onChange={e => setTrackingInputs(p => ({ ...p, [order.id]: e.target.value }))}
                          />
                        ) : '—'}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {order.dispatch_status === 'pending' && (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleDispatch(order)}
                            disabled={saving === order.id}
                          >
                            {saving === order.id ? '...' : 'Mark Dispatched'}
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
                          <span style={{ fontSize: '12px', color: 'var(--bone-muted)' }}>Delivered {formatDateTime(order.dispatched_at)}</span>
                        )}
                      </td>
                    </tr>
                  ))}
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
