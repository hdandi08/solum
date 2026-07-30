import { useCallback, useEffect, useState } from 'react'
import RiskBadge from '../components/RiskBadge'
import { normalizeDashboardPayload } from '../features/dashboard/model'
import { adminApi } from '../lib/adminClient'

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatMoney(pence) {
  return `£${((pence ?? 0) / 100).toFixed(2)}`
}

function Risk({ level }) {
  if (level === 'no_data') {
    return <span style={{ color: 'var(--bone-muted)', fontSize: 12 }}>No data</span>
  }
  return <RiskBadge level={level} />
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const payload = await adminApi.request('admin-dashboard', {
        body: {},
      })
      setDashboard(normalizeDashboardPayload(payload))
    } catch (caught) {
      setError(caught.message || 'Dashboard could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        Loading dashboard...
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="page-title">Dashboard</h1>
        <div className="error-state">{error}</div>
        <button
          className="btn btn-secondary"
          style={{ marginTop: 16 }}
          onClick={load}
        >
          Retry
        </button>
      </div>
    )
  }

  const {
    summary,
    subscribers_by_kit: subscribers,
    products,
    recent_orders: recentOrders,
    recent_inventory_events: recentEvents,
  } = dashboard

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>

      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-value">{summary.active_subscribers}</div>
          <div className="stat-label">Active Subscribers</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{summary.pending_orders}</div>
          <div className="stat-label">Pending Orders</div>
        </div>
        <div className="stat-card">
          <div
            className="stat-value"
            style={{
              color: summary.unresolved_payment_issues > 0
                ? 'var(--critical)'
                : 'var(--bone)',
            }}
          >
            {summary.unresolved_payment_issues}
          </div>
          <div className="stat-label">Payment Issues</div>
        </div>
        <div className="stat-card">
          <div
            className="stat-value"
            style={{
              color: summary.products_at_risk > 0
                ? 'var(--critical)'
                : 'var(--ok)',
            }}
          >
            {summary.products_at_risk}
          </div>
          <div className="stat-label">Products at Risk</div>
        </div>
      </div>

      <div className="section-title">Subscribers by Kit</div>
      <div className="stat-cards">
        {['ground', 'ritual', 'sovereign'].map((kit) => (
          <div className="stat-card" key={kit}>
            <div className="stat-value">{subscribers[kit]}</div>
            <div className="stat-label">{kit}</div>
          </div>
        ))}
      </div>

      <div className="section-title">Stock Health</div>
      <div className="card" style={{ padding: 0, marginBottom: 32 }}>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Stock</th>
                <th>Monthly Burn</th>
                <th>Runway</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="no-data">No products found.</td>
                </tr>
              ) : products.map((product) => (
                <tr key={product.id}>
                  <td style={{ fontWeight: 500 }}>{product.name}</td>
                  <td>{product.current_stock.toLocaleString()}</td>
                  <td>
                    {product.monthly_burn === 0
                      ? '—'
                      : product.monthly_burn.toLocaleString()}
                  </td>
                  <td>
                    {product.weeks_runway === null
                      ? '—'
                      : `${product.weeks_runway} wks`}
                  </td>
                  <td><Risk level={product.risk_level} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section-title">Recent Orders</div>
      <div className="card" style={{ padding: 0, marginBottom: 32 }}>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer</th>
                <th>Kit</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Dispatch</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="no-data">No orders yet.</td>
                </tr>
              ) : recentOrders.map((order) => {
                const customer = order.customers
                const name = [
                  customer?.first_name,
                  customer?.last_name,
                ].filter(Boolean).join(' ')
                return (
                  <tr key={order.id}>
                    <td>{formatDate(order.created_at)}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{name || '—'}</div>
                      <div style={{ color: 'var(--bone-muted)', fontSize: 12 }}>
                        {customer?.email || '—'}
                      </div>
                    </td>
                    <td style={{ textTransform: 'uppercase' }}>
                      {order.kit_id || '—'}
                    </td>
                    <td>{order.order_type?.replace(/_/g, ' ') || '—'}</td>
                    <td>{formatMoney(order.amount_pence)}</td>
                    <td>{order.dispatch_status || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section-title">Recent Inventory Events</div>
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Product</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="no-data">No inventory events.</td>
                </tr>
              ) : recentEvents.map((event) => (
                <tr key={event.id}>
                  <td>{formatDate(event.created_at)}</td>
                  <td>{event.product_name}</td>
                  <td>{event.transaction_type?.replace(/_/g, ' ')}</td>
                  <td>{event.quantity}</td>
                  <td>{event.reference_id || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
