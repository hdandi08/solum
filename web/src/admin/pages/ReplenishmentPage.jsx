import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function StatusBadge({ status }) {
  return (
    <span className={`status-badge ${status}`}>
      {status?.replace('_', ' ')}
    </span>
  )
}

export default function ReplenishmentPage() {
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [delivering, setDelivering] = useState(null) // order id being delivered
  const [deliverError, setDeliverError] = useState('')

  const [orderForm, setOrderForm] = useState({
    supplier_name: '',
    product_id: '',
    quantity_ordered: '',
    unit_cost: '',
    order_date: todayISO(),
    expected_delivery_date: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()

      // Fetch supplier orders
      const [ordersRes, dashRes] = await Promise.all([
        fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-supplier-orders`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ action: 'list' }),
          }
        ),
        fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-dashboard`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({}),
          }
        ),
      ])

      if (ordersRes.ok) {
        const ordersJson = await ordersRes.json()
        setOrders(ordersJson.orders || ordersJson || [])
      } else {
        // Graceful degradation: show empty if endpoint not deployed yet
        setOrders([])
      }

      if (dashRes.ok) {
        const dashJson = await dashRes.json()
        setProducts(dashJson.products || [])
      }
    } catch (err) {
      setError(err.message || 'Failed to load replenishment data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleMarkDelivered = async (orderId) => {
    setDelivering(orderId)
    setDeliverError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-confirm-delivery`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ supplier_order_id: orderId }),
        }
      )

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `Failed to confirm delivery (${response.status})`)
      }

      await fetchData()
    } catch (err) {
      setDeliverError(err.message || 'Failed to confirm delivery.')
    } finally {
      setDelivering(null)
    }
  }

  const handleOrderSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError('')
    setSubmitSuccess(false)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-supplier-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            supplier_name: orderForm.supplier_name,
            product_id: orderForm.product_id,
            quantity_ordered: parseInt(orderForm.quantity_ordered, 10),
            unit_cost: parseFloat(orderForm.unit_cost),
            order_date: orderForm.order_date,
            expected_delivery_date: orderForm.expected_delivery_date || null,
            notes: orderForm.notes || null,
          }),
        }
      )

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `Failed to create order (${response.status})`)
      }

      setOrderForm({
        supplier_name: '',
        product_id: '',
        quantity_ordered: '',
        unit_cost: '',
        order_date: todayISO(),
        expected_delivery_date: '',
        notes: '',
      })
      setSubmitSuccess(true)
      await fetchData()
    } catch (err) {
      setSubmitError(err.message || 'Failed to create order.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        Loading replenishment data...
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="page-title">Replenishment</h1>
        <div className="error-state">{error}</div>
        <button className="btn btn-secondary" style={{ marginTop: '16px' }} onClick={fetchData}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <div>
      <h1 className="page-title">Replenishment</h1>

      {/* Orders Table */}
      <div className="section">
        <div className="section-title">Pending & Recent Orders</div>

        {deliverError && (
          <div className="error-state" style={{ marginBottom: '16px' }}>
            {deliverError}
          </div>
        )}

        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Product</th>
                  <th>Qty Ordered</th>
                  <th>Unit Cost</th>
                  <th>Order Date</th>
                  <th>Expected Delivery</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="no-data">No supplier orders yet.</td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id}>
                      <td style={{ fontWeight: 500 }}>{order.supplier_name}</td>
                      <td>{order.product_name || order.product_id}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {Number(order.quantity_ordered).toLocaleString()}
                      </td>
                      <td>
                        {order.unit_cost != null ? `£${Number(order.unit_cost).toFixed(2)}` : '—'}
                      </td>
                      <td>{formatDate(order.order_date)}</td>
                      <td>{formatDate(order.expected_delivery_date)}</td>
                      <td>
                        <StatusBadge status={order.status} />
                      </td>
                      <td>
                        {['pending', 'in_transit'].includes(order.status) ? (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleMarkDelivered(order.id)}
                            disabled={delivering === order.id}
                          >
                            {delivering === order.id ? 'Confirming...' : 'Mark Delivered'}
                          </button>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--bone-muted)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* New Order Form */}
      <div className="section">
        <div className="section-title">New Supplier Order</div>
        <div className="card">
          {submitSuccess && (
            <div
              style={{
                background: 'var(--ok-bg)',
                border: '1px solid var(--ok)',
                borderRadius: '4px',
                padding: '12px 16px',
                color: 'var(--ok)',
                fontSize: '13px',
                marginBottom: '20px',
              }}
            >
              Order created successfully.
            </div>
          )}

          {submitError && (
            <div className="error-state" style={{ marginBottom: '20px' }}>
              {submitError}
            </div>
          )}

          <form onSubmit={handleOrderSubmit}>
            <div className="form-grid" style={{ marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label">Supplier Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Cosmiko UK"
                  value={orderForm.supplier_name}
                  onChange={(e) => setOrderForm({ ...orderForm, supplier_name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Product</label>
                <select
                  className="select"
                  value={orderForm.product_id}
                  onChange={(e) => setOrderForm({ ...orderForm, product_id: e.target.value })}
                  required
                >
                  <option value="">Select product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Quantity Ordered</label>
                <input
                  type="number"
                  className="input"
                  placeholder="250"
                  min="1"
                  value={orderForm.quantity_ordered}
                  onChange={(e) => setOrderForm({ ...orderForm, quantity_ordered: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Unit Cost (£)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="3.20"
                  min="0"
                  step="0.01"
                  value={orderForm.unit_cost}
                  onChange={(e) => setOrderForm({ ...orderForm, unit_cost: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Order Date</label>
                <input
                  type="date"
                  className="input"
                  value={orderForm.order_date}
                  onChange={(e) => setOrderForm({ ...orderForm, order_date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Expected Delivery</label>
                <input
                  type="date"
                  className="input"
                  value={orderForm.expected_delivery_date}
                  onChange={(e) => setOrderForm({ ...orderForm, expected_delivery_date: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Notes (optional)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Optional order notes..."
                  value={orderForm.notes}
                  onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating Order...' : 'Create Supplier Order'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
