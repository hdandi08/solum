import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import RiskBadge from '../components/RiskBadge'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getRiskLevel(runway, stock) {
  if (stock === 0) return 'out_of_stock'
  if (runway === null) return 'ok' // no subscribers = infinite runway
  if (runway < 4) return 'critical'
  if (runway < 8) return 'low'
  return 'ok'
}

function riskOrder(level) {
  const order = { out_of_stock: 0, critical: 1, low: 2, ok: 3 }
  return order[level] ?? 99
}

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(
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
      )

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `Request failed (${response.status})`)
      }

      const json = await response.json()
      setData(json)
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

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
        <button className="btn btn-secondary" style={{ marginTop: '16px' }} onClick={fetchDashboard}>
          Retry
        </button>
      </div>
    )
  }

  const {
    products = [],
    active_subscribers = 0,
    pending_deliveries = 0,
    recent_transactions = [],
  } = data || {}

  // Annotate products with risk levels and sort
  const annotated = products.map((p) => {
    const risk = getRiskLevel(p.runway_weeks, p.current_stock)
    return { ...p, risk }
  }).sort((a, b) => riskOrder(a.risk) - riskOrder(b.risk))

  const totalProducts = annotated.length
  const atRisk = annotated.filter(p => ['low', 'critical', 'out_of_stock'].includes(p.risk)).length
  const criticalProducts = annotated.filter(p => ['critical', 'out_of_stock'].includes(p.risk))

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>

      {/* Stat Cards */}
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-value">{totalProducts}</div>
          <div className="stat-label">Products Tracked</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: atRisk > 0 ? 'var(--critical)' : 'var(--ok)' }}>
            {atRisk}
          </div>
          <div className="stat-label">Products at Risk</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{active_subscribers}</div>
          <div className="stat-label">Active Subscribers</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{pending_deliveries}</div>
          <div className="stat-label">Pending Deliveries</div>
        </div>
      </div>

      {/* Risk Alerts */}
      {criticalProducts.length > 0 && (
        <div className="alert-banner">
          <div className="alert-banner-title">Stock Alerts — Immediate Action Required</div>
          <ul>
            {criticalProducts.map((p) => (
              <li key={p.id}>
                {p.name}
                {p.current_stock === 0
                  ? ' — OUT OF STOCK'
                  : p.runway_weeks !== null
                  ? ` — ${p.runway_weeks} weeks runway remaining`
                  : ' — Critical stock level'}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Stock Overview */}
      <div className="section">
        <div className="section-title">Stock Overview</div>
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Stock (units)</th>
                  <th>Monthly Burn</th>
                  <th>Runway</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {annotated.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="no-data">No products found.</td>
                  </tr>
                ) : (
                  annotated.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 500 }}>{p.name}</td>
                      <td>{p.current_stock.toLocaleString()}</td>
                      <td>
                        {p.monthly_burn === 0 ? (
                          <span style={{ color: 'var(--bone-muted)' }}>—</span>
                        ) : (
                          p.monthly_burn.toLocaleString()
                        )}
                      </td>
                      <td>
                        {p.monthly_burn === 0 ? (
                          <span style={{ color: 'var(--bone-muted)' }}>—</span>
                        ) : p.runway_weeks !== null ? (
                          `${p.runway_weeks} wks`
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        {p.monthly_burn === 0 ? (
                          <span style={{ fontSize: '12px', color: 'var(--bone-muted)' }}>No data</span>
                        ) : (
                          <RiskBadge level={p.risk} />
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

      {/* Recent Activity */}
      <div className="section">
        <div className="section-title">Recent Activity</div>
        <div className="card">
          {recent_transactions.length === 0 ? (
            <div className="no-data">No recent transactions.</div>
          ) : (
            <div className="activity-list">
              {recent_transactions.slice(0, 8).map((tx) => (
                <div key={tx.id} className="activity-item">
                  <div className="activity-product">{tx.product_name || tx.product_id}</div>
                  <span
                    className={`type-badge ${tx.transaction_type}`}
                    style={{ fontSize: '11px' }}
                  >
                    {tx.transaction_type?.replace('_', ' ')}
                  </span>
                  <span className={tx.quantity > 0 ? 'qty-positive' : 'qty-negative'}>
                    {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                  </span>
                  <span className="activity-meta">{formatDate(tx.created_at)}</span>
                  {tx.created_by && (
                    <span className="activity-meta">{tx.created_by}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
