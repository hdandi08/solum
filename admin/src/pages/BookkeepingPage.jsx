import { useState, useEffect, useCallback } from 'react'
import { useEnv } from '../context/EnvContext'

const PAGE_SIZE = 40
const CATEGORIES = ['inventory', 'packaging', 'marketing', 'compliance', 'operations', 'other']
const CAT_COLORS = {
  inventory:   'var(--sky-blue)',
  packaging:   'var(--low)',
  marketing:   '#a78bfa',
  compliance:  'var(--bone-muted)',
  operations:  'var(--steel-blue)',
  other:       'var(--bone-muted)',
}

function pence(p) { return `£${((p || 0) / 100).toFixed(2)}` }
function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function BookkeepingPage() {
  const { config } = useEnv()

  // Entry list
  const [entries, setEntries]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [page, setPage]             = useState(0)
  const [total, setTotal]           = useState(0)
  const [catFilter, setCatFilter]   = useState('')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')

  // Totals
  const [totals, setTotals] = useState({})

  // Add entry form
  const [form, setForm] = useState({ date: today(), category: 'inventory', description: '', amount: '' })
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  const loadTotals = useCallback(async () => {
    try {
      const { data } = await config.client
        .from('bookkeeping_entries')
        .select('category, amount_pence')
      if (!data) return
      const t = {}
      for (const row of data) {
        t[row.category] = (t[row.category] || 0) + row.amount_pence
      }
      setTotals(t)
    } catch { /* non-critical */ }
  }, [config])

  const loadEntries = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      let q = config.client
        .from('bookkeeping_entries')
        .select('*', { count: 'exact' })
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      if (catFilter) q = q.eq('category', catFilter)
      if (dateFrom)  q = q.gte('date', dateFrom)
      if (dateTo)    q = q.lte('date', dateTo)
      const { data, count, error: err } = await q
      if (err) throw err
      setEntries(data || [])
      setTotal(count || 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [page, catFilter, dateFrom, dateTo, config])

  useEffect(() => { loadTotals() }, [loadTotals])
  useEffect(() => { loadEntries() }, [loadEntries])

  async function addEntry() {
    setAddError('')
    const amountPence = Math.round(parseFloat(form.amount) * 100)
    if (!form.date)        return setAddError('Date is required.')
    if (!form.description.trim()) return setAddError('Description is required.')
    if (!form.amount || isNaN(amountPence) || amountPence <= 0) return setAddError('Amount must be a positive number.')

    setAdding(true)
    try {
      const { error: err } = await config.client.from('bookkeeping_entries').insert({
        date: form.date,
        category: form.category,
        description: form.description.trim(),
        amount_pence: amountPence,
      })
      if (err) throw err
      setForm({ date: today(), category: 'inventory', description: '', amount: '' })
      await Promise.all([loadEntries(), loadTotals()])
    } catch (err) {
      setAddError(err.message)
    } finally {
      setAdding(false)
    }
  }

  async function deleteEntry(id) {
    if (!confirm('Delete this entry?')) return
    try {
      await config.client.from('bookkeeping_entries').delete().eq('id', id)
      await Promise.all([loadEntries(), loadTotals()])
    } catch (err) {
      alert(err.message)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0)

  return (
    <div>
      <h1 className="page-title">Bookkeeping</h1>

      {/* Category Totals */}
      <div className="section-title">All-Time by Category</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
        {CATEGORIES.map(cat => (
          <div key={cat} className="card" style={{ padding: '16px 20px', cursor: 'pointer', borderColor: catFilter === cat ? 'var(--steel-blue)' : 'var(--border)' }}
            onClick={() => { setCatFilter(catFilter === cat ? '' : cat); setPage(0) }}>
            <div style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: CAT_COLORS[cat], marginBottom: 6, fontWeight: 600 }}>{cat}</div>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: 24, letterSpacing: '0.05em', color: 'var(--bone)' }}>{pence(totals[cat] || 0)}</div>
          </div>
        ))}
        <div className="card" style={{ padding: '16px 20px', borderColor: 'var(--steel-blue)' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bone-muted)', marginBottom: 6, fontWeight: 600 }}>Total</div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 24, letterSpacing: '0.05em', color: 'var(--sky-blue)' }}>{pence(grandTotal)}</div>
        </div>
      </div>

      {/* Add Entry */}
      <div className="section-title">Add Entry</div>
      <div className="card" style={{ marginBottom: 32 }}>
        <div className="form-row" style={{ alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <div className="form-group" style={{ minWidth: 130 }}>
            <label className="form-label">Date</label>
            <input type="date" className="input" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
          </div>
          <div className="form-group" style={{ minWidth: 150 }}>
            <label className="form-label">Category</label>
            <select className="select" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 2, minWidth: 200 }}>
            <label className="form-label">Description</label>
            <input className="input" placeholder="e.g. Body wash restock — 500 units" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="form-group" style={{ minWidth: 120 }}>
            <label className="form-label">Amount (£)</label>
            <input type="number" min="0.01" step="0.01" className="input" placeholder="0.00" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addEntry()} />
          </div>
          <button className="btn btn-primary" onClick={addEntry} disabled={adding} style={{ flexShrink: 0 }}>
            {adding ? '...' : 'Add Entry'}
          </button>
        </div>
        {addError && <div style={{ marginTop: 12, fontSize: 13, color: 'var(--critical)' }}>{addError}</div>}
      </div>

      {/* Entries Log */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="section-title" style={{ marginBottom: 0 }}>Entries</div>
        <div className="filters-bar" style={{ marginBottom: 0 }}>
          <div className="form-group">
            <select className="select" style={{ fontSize: 12, padding: '5px 10px' }} value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(0) }}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <input type="date" className="input" style={{ fontSize: 12, padding: '5px 10px' }} value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0) }} placeholder="From" />
          </div>
          <div className="form-group">
            <input type="date" className="input" style={{ fontSize: 12, padding: '5px 10px' }} value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0) }} placeholder="To" />
          </div>
          {(catFilter || dateFrom || dateTo) && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setCatFilter(''); setDateFrom(''); setDateTo(''); setPage(0) }}>Clear</button>
          )}
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
                  <th>Category</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr><td colSpan={5} className="no-data">No entries found.</td></tr>
                ) : entries.map(e => (
                  <tr key={e.id}>
                    <td style={{ fontSize: 13, color: 'var(--bone-muted)', whiteSpace: 'nowrap' }}>{fmt(e.date)}</td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: CAT_COLORS[e.category] }}>
                        {e.category}
                      </span>
                    </td>
                    <td style={{ fontSize: 13 }}>{e.description}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500, textAlign: 'right' }}>{pence(e.amount_pence)}</td>
                    <td>
                      <button className="btn btn-sm" style={{ background: 'none', border: 'none', color: 'var(--bone-muted)', cursor: 'pointer', fontSize: 16, padding: '2px 6px' }}
                        onClick={() => deleteEntry(e.id)} title="Delete">
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="pagination">
              <span className="pagination-info">Page {page + 1} of {totalPages} ({total} entries)</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Prev</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Next</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
