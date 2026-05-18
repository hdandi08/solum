import { useState, useEffect, useCallback } from 'react'
import { useEnv } from '../context/EnvContext'

const PAGE_SIZE = 30
const KIT_MONTHLY_PENCE = { ground: 3800, ritual: 4800, sovereign: 5800 }

function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function pence(p) { return `£${((p || 0) / 100).toFixed(0)}` }

function PaymentStatusBadge({ status }) {
  const map = {
    active:    { cls: 'ok',       label: 'Active' },
    past_due:  { cls: 'low',      label: 'Past Due' },
    unpaid:    { cls: 'critical', label: 'Unpaid' },
    cancelled: { cls: 'no-data',  label: 'Cancelled' },
  }
  const { cls, label } = map[status] || { cls: 'no-data', label: status || '—' }
  return <span className={`risk-badge ${cls}`}>{label}</span>
}

export default function SubscribersPage() {
  const { config } = useEnv()
  const [subs, setSubs]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [page, setPage]             = useState(0)
  const [total, setTotal]           = useState(0)
  const [payStatusFilter, setPayStatusFilter] = useState('')
  const [kitFilter, setKitFilter]   = useState('')
  const [stats, setStats]           = useState({ active: 0, mrr: 0, avgMonths: 0, atRisk: 0 })

  const loadStats = useCallback(async () => {
    try {
      const { data } = await config.client
        .from('subscriptions')
        .select('kit_id, months_active, payment_status')
        .eq('status', 'active')
      if (!data) return
      const mrr = data.reduce((s, sub) => s + (KIT_MONTHLY_PENCE[sub.kit_id] || 0), 0)
      const avgMonths = data.length > 0 ? Math.round(data.reduce((s, sub) => s + (sub.months_active || 0), 0) / data.length) : 0
      const atRisk = data.filter(s => s.payment_status === 'past_due' || s.payment_status === 'unpaid').length
      setStats({ active: data.length, mrr, avgMonths, atRisk })
    } catch { /* non-critical */ }
  }, [config])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      let q = config.client
        .from('subscriptions')
        .select('*, customers(first_name, last_name, email)', { count: 'exact' })
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      if (payStatusFilter) q = q.eq('payment_status', payStatusFilter)
      if (kitFilter)       q = q.eq('kit_id', kitFilter)
      const { data, count, error: err } = await q
      if (err) throw err
      setSubs(data || [])
      setTotal(count || 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [page, payStatusFilter, kitFilter, config])

  useEffect(() => { loadStats() }, [loadStats])
  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const daysUntil = d => {
    if (!d) return null
    return Math.ceil((new Date(d) - new Date()) / (1000 * 60 * 60 * 24))
  }

  return (
    <div>
      <h1 className="page-title">Subscribers</h1>

      {/* Stats */}
      <div className="stat-cards" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 32 }}>
        <div className="stat-card">
          <div className="stat-value">{stats.active}</div>
          <div className="stat-label">Active Subscribers</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--sky-blue)' }}>{pence(stats.mrr)}</div>
          <div className="stat-label">MRR</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.avgMonths}</div>
          <div className="stat-label">Avg. Months Active</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: stats.atRisk > 0 ? 'var(--critical)' : 'var(--bone)' }}>{stats.atRisk}</div>
          <div className="stat-label">At Risk</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar" style={{ marginBottom: 24 }}>
        <div className="form-group">
          <label className="form-label">Payment Status</label>
          <select className="select" value={payStatusFilter} onChange={e => { setPayStatusFilter(e.target.value); setPage(0) }}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="past_due">Past Due</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Kit</label>
          <select className="select" value={kitFilter} onChange={e => { setKitFilter(e.target.value); setPage(0) }}>
            <option value="">All Kits</option>
            <option value="ground">Ground</option>
            <option value="ritual">Ritual</option>
            <option value="sovereign">Sovereign</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => { setPayStatusFilter(''); setKitFilter(''); setPage(0) }}>Clear</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', marginLeft: 'auto', fontSize: 13, color: 'var(--bone-muted)' }}>
          {total} subscribers
        </div>
      </div>

      {loading ? (
        <div className="loading-state"><div className="loading-spinner" />Loading subscribers...</div>
      ) : error ? (
        <div className="error-state">{error}</div>
      ) : (
        <>
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Kit</th>
                    <th>Payment</th>
                    <th>Months</th>
                    <th>Next Due</th>
                    <th>Days Away</th>
                    <th>Failures</th>
                    <th>Last Paid</th>
                    <th>Subscribed</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.length === 0 ? (
                    <tr><td colSpan={9} className="no-data">No subscribers found.</td></tr>
                  ) : subs.map(s => {
                    const days = daysUntil(s.next_payment_due)
                    const daysColor = days !== null && days <= 3 ? 'var(--critical)' : days !== null && days <= 7 ? 'var(--low)' : 'var(--bone-muted)'
                    return (
                      <tr key={s.id}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{[s.customers?.first_name, s.customers?.last_name].filter(Boolean).join(' ') || '—'}</div>
                          <div style={{ fontSize: 12, color: 'var(--bone-muted)' }}>{s.customers?.email}</div>
                        </td>
                        <td style={{ textTransform: 'uppercase', fontSize: 13, letterSpacing: '0.05em', fontWeight: 600, color: 'var(--sky-blue)' }}>{s.kit_id}</td>
                        <td><PaymentStatusBadge status={s.payment_status} /></td>
                        <td style={{ fontSize: 13, color: 'var(--bone-muted)' }}>{s.months_active ?? 0}</td>
                        <td style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{fmt(s.next_payment_due)}</td>
                        <td style={{ color: daysColor, fontWeight: 600, fontSize: 13 }}>
                          {days !== null ? `${days}d` : '—'}
                        </td>
                        <td style={{ fontSize: 13, color: s.consecutive_failures > 0 ? 'var(--critical)' : 'var(--bone-muted)' }}>
                          {s.consecutive_failures || 0}
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--bone-muted)', whiteSpace: 'nowrap' }}>{fmt(s.last_payment_at)}</td>
                        <td style={{ fontSize: 13, color: 'var(--bone-muted)', whiteSpace: 'nowrap' }}>{fmt(s.created_at)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="pagination">
              <span className="pagination-info">Page {page + 1} of {totalPages} ({total} subscribers)</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Prev</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Next</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
