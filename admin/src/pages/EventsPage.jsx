import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const PAGE_SIZE = 25

function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function TypeBadge({ type }) {
  return (
    <span className={`type-badge ${type}`}>
      {type?.replace(/_/g, ' ')}
    </span>
  )
}

function QtyDisplay({ qty, type }) {
  const isPositive = qty > 0 || type === 'inbound'
  return (
    <span className={isPositive ? 'qty-positive' : 'qty-negative'}>
      {isPositive ? `+${Math.abs(qty)}` : `-${Math.abs(qty)}`}
    </span>
  )
}

export default function EventsPage() {
  const [transactions, setTransactions] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  const [filters, setFilters] = useState({
    product_id: '',
    type: '',
    date_from: '',
    date_to: todayISO(),
  })

  const fetchTransactions = useCallback(async (currentFilters, currentPage) => {
    setLoading(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()

      // Try edge function first
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-events`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            product_id: currentFilters.product_id || null,
            transaction_type: currentFilters.type || null,
            date_from: currentFilters.date_from || null,
            date_to: currentFilters.date_to || null,
            page: currentPage,
            page_size: PAGE_SIZE,
          }),
        }
      )

      if (response.ok) {
        const json = await response.json()
        setTransactions(json.transactions || json || [])
        setTotalCount(json.total_count || (json.transactions || json || []).length)
      } else {
        // Fallback: query Supabase directly
        await fetchDirect(currentFilters, currentPage)
      }
    } catch {
      await fetchDirect(currentFilters, currentPage)
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line

  const fetchDirect = async (currentFilters, currentPage) => {
    try {
      let query = supabase
        .from('inventory_transactions')
        .select('*, products(name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1)

      if (currentFilters.product_id) {
        query = query.eq('product_id', currentFilters.product_id)
      }
      if (currentFilters.type) {
        query = query.eq('transaction_type', currentFilters.type)
      }
      if (currentFilters.date_from) {
        query = query.gte('created_at', `${currentFilters.date_from}T00:00:00`)
      }
      if (currentFilters.date_to) {
        query = query.lte('created_at', `${currentFilters.date_to}T23:59:59`)
      }

      const { data, count, error: dbError } = await query

      if (dbError) throw new Error(dbError.message)

      const mapped = (data || []).map((tx) => ({
        ...tx,
        product_name: tx.products?.name || tx.product_id,
      }))

      setTransactions(mapped)
      setTotalCount(count || 0)
    } catch (err) {
      setError(err.message || 'Failed to load events.')
    }
  }

  const fetchProducts = useCallback(async () => {
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
      if (response.ok) {
        const json = await response.json()
        setProducts(json.products || [])
      }
    } catch {
      // Non-critical — product filter still usable as text
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  useEffect(() => {
    fetchTransactions(filters, page)
  }, [filters, page, fetchTransactions])

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(0)
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div>
      <h1 className="page-title">Events</h1>

      {/* Filters */}
      <div className="filters-bar">
        <div className="form-group">
          <label className="form-label">Product</label>
          <select
            className="select"
            value={filters.product_id}
            onChange={(e) => handleFilterChange('product_id', e.target.value)}
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Type</label>
          <select
            className="select"
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
          >
            <option value="">All Types</option>
            <option value="inbound">Inbound</option>
            <option value="outbound_order">Outbound Order</option>
            <option value="adjustment">Adjustment</option>
            <option value="damaged">Damaged</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Date From</label>
          <input
            type="date"
            className="input"
            value={filters.date_from}
            onChange={(e) => handleFilterChange('date_from', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Date To</label>
          <input
            type="date"
            className="input"
            value={filters.date_to}
            onChange={(e) => handleFilterChange('date_to', e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '1px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setFilters({ product_id: '', type: '', date_from: '', date_to: todayISO() })
              setPage(0)
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          Loading events...
        </div>
      ) : error ? (
        <div className="error-state">{error}</div>
      ) : (
        <>
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date / Time</th>
                    <th>Product</th>
                    <th>Type</th>
                    <th>Qty</th>
                    <th>Reference</th>
                    <th>Notes</th>
                    <th>By</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="no-data">No transactions found.</td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td style={{ color: 'var(--bone-dim)', whiteSpace: 'nowrap', fontSize: '13px' }}>
                          {formatDateTime(tx.created_at)}
                        </td>
                        <td style={{ fontWeight: 500 }}>
                          {tx.product_name || tx.product_id}
                        </td>
                        <td>
                          <TypeBadge type={tx.transaction_type} />
                        </td>
                        <td>
                          <QtyDisplay qty={tx.quantity} type={tx.transaction_type} />
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--bone-dim)', fontFamily: 'monospace' }}>
                          {tx.reference || '—'}
                        </td>
                        <td style={{ fontSize: '13px', color: 'var(--bone-dim)', maxWidth: '200px' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                            {tx.notes || '—'}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--bone-muted)' }}>
                          {tx.created_by || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <span className="pagination-info">
                Page {page + 1} of {totalPages} ({totalCount} events)
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Prev
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
