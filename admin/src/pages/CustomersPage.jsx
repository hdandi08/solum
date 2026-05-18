import { useState, useEffect, useCallback, useRef } from 'react'
import { useEnv } from '../context/EnvContext'
import CustomerPanel from '../components/CustomerPanel'

const PAGE_SIZE = 40

function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function SubStatusBadge({ status }) {
  const map = {
    active:    { cls: 'ok',       label: 'Active' },
    past_due:  { cls: 'low',      label: 'Past Due' },
    unpaid:    { cls: 'critical', label: 'Unpaid' },
    cancelled: { cls: 'no-data',  label: 'Cancelled' },
  }
  const { cls, label } = map[status] || { cls: 'no-data', label: '—' }
  return <span className={`risk-badge ${cls}`}>{label}</span>
}

export default function CustomersPage() {
  const { config } = useEnv()

  const [customers, setCustomers]         = useState([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState('')
  const [page, setPage]                   = useState(0)
  const [total, setTotal]                 = useState(0)
  const [search, setSearch]               = useState('')
  const [searchInput, setSearchInput]     = useState('')
  const [kitFilter, setKitFilter]         = useState('')
  const [subStatusFilter, setSubStatusFilter] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)
  const [stats, setStats]                 = useState({ total: 0, active: 0, pastDue: 0, noSub: 0 })

  const debounceRef = useRef(null)

  const loadStats = useCallback(async () => {
    try {
      const [{ count: total }, { data: subs }] = await Promise.all([
        config.client.from('customers').select('*', { count: 'exact', head: true }),
        config.client.from('subscriptions').select('payment_status').eq('status', 'active'),
      ])
      const active  = (subs || []).filter(s => s.payment_status === 'active').length
      const pastDue = (subs || []).filter(s => s.payment_status === 'past_due' || s.payment_status === 'unpaid').length
      setStats({ total: total || 0, active, pastDue, noSub: (total || 0) - (subs || []).length })
    } catch { /* non-critical */ }
  }, [config])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      let q = config.client
        .from('customers')
        .select('*, subscriptions(kit_id, status, payment_status, months_active, next_payment_due)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (search) {
        q = q.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
      }

      const { data, count, error: err } = await q
      if (err) throw err

      // Attach active subscription per customer
      const rows = (data || []).map(c => {
        const activeSub = (c.subscriptions || []).find(s => s.status === 'active')
        return { ...c, activeSub: activeSub || null }
      })

      // Client-side filter on kit / sub status (applied after fetch since embedded filters act as inner joins)
      const filtered = rows.filter(c => {
        if (kitFilter && c.activeSub?.kit_id !== kitFilter) return false
        if (subStatusFilter) {
          if (subStatusFilter === 'none' && c.activeSub) return false
          if (subStatusFilter !== 'none' && c.activeSub?.payment_status !== subStatusFilter) return false
        }
        return true
      })

      setCustomers(filtered)
      setTotal(count || 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [page, search, kitFilter, subStatusFilter, config])

  useEffect(() => { loadStats() }, [loadStats])
  useEffect(() => { load() }, [load])

  function handleSearchInput(val) {
    setSearchInput(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearch(val.trim())
      setPage(0)
    }, 350)
  }

  function clearFilters() {
    setSearchInput('')
    setSearch('')
    setKitFilter('')
    setSubStatusFilter('')
    setPage(0)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const hasFilters = searchInput || kitFilter || subStatusFilter

  return (
    <div>
      <h1 className="page-title">Customers</h1>

      {/* Stats */}
      <div className="stat-cards" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 32 }}>
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Customers</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--ok)' }}>{stats.active}</div>
          <div className="stat-label">Active Subscribers</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: stats.pastDue > 0 ? 'var(--low)' : 'var(--bone)' }}>{stats.pastDue}</div>
          <div className="stat-label">Past Due / Unpaid</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--bone-muted)' }}>{stats.noSub}</div>
          <div className="stat-label">No Subscription</div>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="filters-bar" style={{ marginBottom: 24 }}>
        <div className="form-group" style={{ flex: 2, minWidth: 220 }}>
          <label className="form-label">Search</label>
          <input
            className="input"
            placeholder="Name or email..."
            value={searchInput}
            onChange={e => handleSearchInput(e.target.value)}
          />
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
        <div className="form-group">
          <label className="form-label">Sub Status</label>
          <select className="select" value={subStatusFilter} onChange={e => { setSubStatusFilter(e.target.value); setPage(0) }}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="past_due">Past Due</option>
            <option value="unpaid">Unpaid</option>
            <option value="none">No Subscription</option>
          </select>
        </div>
        {hasFilters && (
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={clearFilters}>Clear</button>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'flex-end', marginLeft: 'auto', fontSize: 13, color: 'var(--bone-muted)' }}>
          {total} customers
        </div>
      </div>

      {loading ? (
        <div className="loading-state"><div className="loading-spinner" />Loading customers...</div>
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
                    <th>Joined</th>
                    <th>Kit</th>
                    <th>Sub Status</th>
                    <th>Months Active</th>
                    <th>Next Due</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.length === 0 ? (
                    <tr><td colSpan={6} className="no-data">No customers found.</td></tr>
                  ) : customers.map(c => (
                    <tr key={c.id}>
                      <td>
                        <button className="customer-link" onClick={() => setSelectedCustomerId(c.id)}>
                          <div className="customer-link-name" style={{ fontWeight: 500 }}>
                            {[c.first_name, c.last_name].filter(Boolean).join(' ') || '—'}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--bone-muted)' }}>{c.email}</div>
                        </button>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--bone-muted)', whiteSpace: 'nowrap' }}>{fmt(c.created_at)}</td>
                      <td style={{ textTransform: 'uppercase', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: c.activeSub ? 'var(--sky-blue)' : 'var(--bone-muted)' }}>
                        {c.activeSub?.kit_id || '—'}
                      </td>
                      <td>
                        {c.activeSub
                          ? <SubStatusBadge status={c.activeSub.payment_status} />
                          : <span style={{ fontSize: 12, color: 'var(--bone-muted)' }}>—</span>
                        }
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--bone-muted)' }}>
                        {c.activeSub?.months_active ?? '—'}
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--bone-muted)', whiteSpace: 'nowrap' }}>
                        {fmt(c.activeSub?.next_payment_due)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <span className="pagination-info">Page {page + 1} of {totalPages} ({total} customers)</span>
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
