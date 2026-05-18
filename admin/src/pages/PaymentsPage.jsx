import { useState, useEffect, useCallback } from 'react'
import { useEnv } from '../context/EnvContext'
import CustomerPanel from '../components/CustomerPanel'

const PAGE_SIZE = 30

function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
function pence(p) { return `£${((p || 0) / 100).toFixed(2)}` }

function IssueTypeBadge({ type }) {
  const map = {
    all_retries_failed: { cls: 'critical', label: 'All Retries Failed' },
    disputed:           { cls: 'critical', label: 'Disputed' },
    bank_block:         { cls: 'low',      label: 'Bank Block' },
  }
  const { cls, label } = map[type] || { cls: 'no-data', label: type }
  return <span className={`risk-badge ${cls}`}>{label}</span>
}

function PaymentStatusBadge({ status }) {
  const map = {
    succeeded: { cls: 'ok',       label: 'Succeeded' },
    failed:    { cls: 'critical', label: 'Failed' },
  }
  const { cls, label } = map[status] || { cls: 'no-data', label: status }
  return <span className={`risk-badge ${cls}`}>{label}</span>
}

function SubStatusBadge({ status }) {
  const map = {
    active:   { cls: 'ok',       label: 'Active' },
    past_due: { cls: 'low',      label: 'Past Due' },
    unpaid:   { cls: 'critical', label: 'Unpaid' },
    cancelled:{ cls: 'no-data',  label: 'Cancelled' },
  }
  const { cls, label } = map[status] || { cls: 'no-data', label: status }
  return <span className={`risk-badge ${cls}`}>{label}</span>
}

// ── At Risk Tab ───────────────────────────────────────────────────────────────
function AtRiskTab({ onCustomerClick }) {
  const { config } = useEnv()
  const [issues, setIssues]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [resolving, setResolving] = useState(null)
  const [notes, setNotes]     = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error: err } = await config.client
        .from('payment_issues')
        .select('*, customers(first_name, last_name, email)')
        .eq('resolved', false)
        .order('created_at', { ascending: false })
      if (err) throw err
      setIssues(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [config])

  useEffect(() => { load() }, [load])

  async function resolve(issueId) {
    setResolving(issueId)
    try {
      const { error: err } = await config.client.from('payment_issues').update({
        resolved: true,
        resolution_note: notes[issueId] || null,
        resolved_at: new Date().toISOString(),
      }).eq('id', issueId)
      if (err) throw err
      setIssues(p => p.filter(i => i.id !== issueId))
    } catch (err) {
      alert(err.message)
    } finally {
      setResolving(null)
    }
  }

  if (loading) return <div className="loading-state"><div className="loading-spinner" />Loading...</div>
  if (error) return <div className="error-state">{error}</div>

  return (
    <div>
      {issues.length === 0 ? (
        <div className="card">
          <div className="no-data" style={{ color: 'var(--ok)' }}>No unresolved payment issues.</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Type</th>
                <th>Attempts</th>
                <th>Failure Code</th>
                <th>Created</th>
                <th>Resolve</th>
              </tr>
            </thead>
            <tbody>
              {issues.map(issue => (
                <tr key={issue.id}>
                  <td>
                    <button className="customer-link" onClick={() => onCustomerClick(issue.customer_id)}>
                      <div className="customer-link-name" style={{ fontWeight: 500 }}>{[issue.customers?.first_name, issue.customers?.last_name].filter(Boolean).join(' ') || '—'}</div>
                      <div style={{ fontSize: 12, color: 'var(--bone-muted)' }}>{issue.customers?.email}</div>
                    </button>
                  </td>
                  <td><IssueTypeBadge type={issue.issue_type} /></td>
                  <td style={{ fontSize: 13, color: 'var(--bone-muted)' }}>{issue.total_attempts}</td>
                  <td style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--critical)' }}>{issue.last_failure_code || '—'}</td>
                  <td style={{ fontSize: 13, color: 'var(--bone-muted)', whiteSpace: 'nowrap' }}>{fmt(issue.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        className="input"
                        style={{ fontSize: 12, padding: '4px 8px', width: 160 }}
                        placeholder="Resolution note..."
                        value={notes[issue.id] || ''}
                        onChange={e => setNotes(p => ({ ...p, [issue.id]: e.target.value }))}
                      />
                      <button className="btn btn-sm btn-primary" onClick={() => resolve(issue.id)} disabled={resolving === issue.id}>
                        {resolving === issue.id ? '...' : 'Resolve'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Upcoming Tab ──────────────────────────────────────────────────────────────
function UpcomingTab({ onCustomerClick }) {
  const { config } = useEnv()
  const [subs, setSubs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      const { data, error: err } = await config.client
        .from('subscriptions')
        .select('*, customers(first_name, last_name, email)')
        .in('payment_status', ['active', 'past_due', 'unpaid'])
        .lte('next_payment_due', in30Days)
        .not('next_payment_due', 'is', null)
        .order('next_payment_due', { ascending: true })
      if (err) throw err
      setSubs(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [config])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="loading-state"><div className="loading-spinner" />Loading...</div>
  if (error) return <div className="error-state">{error}</div>

  const today = new Date()
  const daysUntil = d => Math.ceil((new Date(d) - today) / (1000 * 60 * 60 * 24))

  return (
    <div className="card" style={{ padding: 0 }}>
      <table className="table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Kit</th>
            <th>Payment Status</th>
            <th>Next Due</th>
            <th>Days Away</th>
            <th>Failures</th>
            <th>Last Paid</th>
          </tr>
        </thead>
        <tbody>
          {subs.length === 0 ? (
            <tr><td colSpan={7} className="no-data">No upcoming payments in the next 30 days.</td></tr>
          ) : subs.map(s => {
            const days = s.next_payment_due ? daysUntil(s.next_payment_due) : null
            const daysColor = days !== null && days <= 3 ? 'var(--critical)' : days !== null && days <= 7 ? 'var(--low)' : 'var(--bone)'
            return (
              <tr key={s.id}>
                <td>
                  <button className="customer-link" onClick={() => onCustomerClick(s.customer_id)}>
                    <div className="customer-link-name" style={{ fontWeight: 500 }}>{[s.customers?.first_name, s.customers?.last_name].filter(Boolean).join(' ') || '—'}</div>
                    <div style={{ fontSize: 12, color: 'var(--bone-muted)' }}>{s.customers?.email}</div>
                  </button>
                </td>
                <td style={{ textTransform: 'uppercase', fontSize: 13, letterSpacing: '0.05em', fontWeight: 600, color: 'var(--sky-blue)' }}>{s.kit_id}</td>
                <td><SubStatusBadge status={s.payment_status} /></td>
                <td style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{fmt(s.next_payment_due)}</td>
                <td style={{ color: daysColor, fontWeight: 600, fontSize: 14 }}>{days !== null ? `${days}d` : '—'}</td>
                <td style={{ fontSize: 13, color: s.consecutive_failures > 0 ? 'var(--critical)' : 'var(--bone-muted)' }}>
                  {s.consecutive_failures || 0}
                </td>
                <td style={{ fontSize: 13, color: 'var(--bone-muted)', whiteSpace: 'nowrap' }}>{fmt(s.last_payment_at)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── History Tab ───────────────────────────────────────────────────────────────
function HistoryTab({ onCustomerClick }) {
  const { config } = useEnv()
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [page, setPage]         = useState(0)
  const [total, setTotal]       = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      let q = config.client
        .from('payment_attempts')
        .select('*, customers(first_name, last_name, email)', { count: 'exact' })
        .order('attempted_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      if (statusFilter) q = q.eq('status', statusFilter)
      if (dateFrom)     q = q.gte('attempted_at', new Date(dateFrom).toISOString())
      if (dateTo)       q = q.lte('attempted_at', new Date(dateTo + 'T23:59:59').toISOString())
      const { data, count, error: err } = await q
      if (err) throw err
      setAttempts(data || [])
      setTotal(count || 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, dateFrom, dateTo, config])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <div className="filters-bar" style={{ marginBottom: 20 }}>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0) }}>
            <option value="">All</option>
            <option value="succeeded">Succeeded</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">From</label>
          <input type="date" className="input" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0) }} />
        </div>
        <div className="form-group">
          <label className="form-label">To</label>
          <input type="date" className="input" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0) }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => { setStatusFilter(''); setDateFrom(''); setDateTo(''); setPage(0) }}>Clear</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', marginLeft: 'auto', fontSize: 13, color: 'var(--bone-muted)' }}>
          {total} attempts
        </div>
      </div>

      {loading ? (
        <div className="loading-state"><div className="loading-spinner" />Loading...</div>
      ) : error ? (
        <div className="error-state">{error}</div>
      ) : (
        <>
          <div className="card" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Attempt #</th>
                  <th>Failure Code</th>
                </tr>
              </thead>
              <tbody>
                {attempts.length === 0 ? (
                  <tr><td colSpan={6} className="no-data">No payment attempts found.</td></tr>
                ) : attempts.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontSize: 13, color: 'var(--bone-muted)', whiteSpace: 'nowrap' }}>{fmtTime(a.attempted_at)}</td>
                    <td>
                      <button className="customer-link" onClick={() => onCustomerClick(a.customer_id)}>
                        <div className="customer-link-name" style={{ fontWeight: 500 }}>{[a.customers?.first_name, a.customers?.last_name].filter(Boolean).join(' ') || '—'}</div>
                        <div style={{ fontSize: 12, color: 'var(--bone-muted)' }}>{a.customers?.email}</div>
                      </button>
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{pence(a.amount_pence)}</td>
                    <td><PaymentStatusBadge status={a.status} /></td>
                    <td style={{ fontSize: 13, color: 'var(--bone-muted)' }}>{a.attempt_number}</td>
                    <td style={{ fontSize: 12, fontFamily: 'monospace', color: a.failure_code ? 'var(--critical)' : 'var(--bone-muted)' }}>
                      {a.failure_code || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="pagination">
              <span className="pagination-info">Page {page + 1} of {totalPages}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Prev</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Next</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
const TABS = ['at-risk', 'upcoming', 'history']
const TAB_LABELS = { 'at-risk': 'At Risk', 'upcoming': 'Upcoming', 'history': 'History' }

export default function PaymentsPage() {
  const [tab, setTab] = useState('at-risk')
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)

  return (
    <div>
      <h1 className="page-title">Payments</h1>

      <div style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: tab === t ? '2px solid var(--steel-blue)' : '2px solid transparent',
              color: tab === t ? 'var(--sky-blue)' : 'var(--bone-muted)',
              padding: '10px 20px',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              transition: 'color 0.15s',
              marginBottom: -1,
            }}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === 'at-risk' && <AtRiskTab onCustomerClick={setSelectedCustomerId} />}
      {tab === 'upcoming' && <UpcomingTab onCustomerClick={setSelectedCustomerId} />}
      {tab === 'history' && <HistoryTab onCustomerClick={setSelectedCustomerId} />}

      {selectedCustomerId && (
        <CustomerPanel customerId={selectedCustomerId} onClose={() => setSelectedCustomerId(null)} />
      )}
    </div>
  )
}
