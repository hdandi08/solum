import { useCallback, useEffect, useState } from 'react'
import {
  normalizeEventsPayload,
  PAGE_SIZE,
  serializeEventFilters,
} from '../features/events/model'
import { adminApi } from '../lib/adminClient'

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function TypeBadge({ type }) {
  return (
    <span className={`type-badge ${type}`}>
      {type?.replace(/_/g, ' ')}
    </span>
  )
}

function Quantity({ quantity, type }) {
  const positive = quantity > 0 || type === 'inbound'
  return (
    <span className={positive ? 'qty-positive' : 'qty-negative'}>
      {positive ? '+' : '-'}{Math.abs(quantity)}
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

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await adminApi.request('admin-events', {
        body: serializeEventFilters({ filters, page }),
      })
      const payload = normalizeEventsPayload(response)
      setTransactions(payload.rows)
      setProducts(payload.products)
      setTotalCount(payload.total_count)
    } catch (requestError) {
      setError(requestError.message || 'Events could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  useEffect(() => {
    load()
  }, [load])

  function changeFilter(key, value) {
    setFilters(current => ({ ...current, [key]: value }))
    setPage(0)
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div>
      <h1 className="page-title">Events</h1>

      <div className="filters-bar">
        <div className="form-group">
          <label className="form-label">Product</label>
          <select
            className="select"
            value={filters.product_id}
            onChange={event =>
              changeFilter('product_id', event.target.value)}
          >
            <option value="">All Products</option>
            {products.map(product => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Type</label>
          <select
            className="select"
            value={filters.type}
            onChange={event => changeFilter('type', event.target.value)}
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
            onChange={event => changeFilter('date_from', event.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Date To</label>
          <input
            type="date"
            className="input"
            value={filters.date_to}
            onChange={event => changeFilter('date_to', event.target.value)}
          />
        </div>

        <div
          style={{
            alignItems: 'flex-end',
            display: 'flex',
            paddingBottom: 1,
          }}
        >
          <button
            className="btn btn-secondary"
            onClick={() => {
              setFilters({
                product_id: '',
                type: '',
                date_from: '',
                date_to: todayISO(),
              })
              setPage(0)
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          Loading events...
        </div>
      ) : error ? (
        <div>
          <div className="error-state">{error}</div>
          <button
            className="btn btn-secondary"
            style={{ marginTop: 16 }}
            onClick={load}
          >
            Retry
          </button>
        </div>
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
                      <td colSpan={7} className="no-data">
                        No transactions found.
                      </td>
                    </tr>
                  ) : transactions.map(transaction => (
                    <tr key={transaction.id}>
                      <td
                        style={{
                          color: 'var(--bone-dim)',
                          fontSize: 13,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatDateTime(transaction.created_at)}
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        {transaction.product_name}
                      </td>
                      <td>
                        <TypeBadge type={transaction.transaction_type} />
                      </td>
                      <td>
                        <Quantity
                          quantity={transaction.quantity}
                          type={transaction.transaction_type}
                        />
                      </td>
                      <td
                        style={{
                          color: 'var(--bone-dim)',
                          fontFamily: 'monospace',
                          fontSize: 12,
                        }}
                      >
                        {transaction.reference_id
                          || transaction.reference_type
                          || '—'}
                      </td>
                      <td
                        style={{
                          color: 'var(--bone-dim)',
                          fontSize: 13,
                          maxWidth: 200,
                        }}
                      >
                        <span
                          title={transaction.notes || undefined}
                          style={{
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {transaction.notes || '—'}
                        </span>
                      </td>
                      <td
                        style={{
                          color: 'var(--bone-muted)',
                          fontSize: 12,
                        }}
                      >
                        {transaction.created_by || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <span className="pagination-info">
                Page {page + 1} of {totalPages} ({totalCount} events)
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPage(current => Math.max(0, current - 1))}
                disabled={page === 0}
              >
                Prev
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  setPage(current =>
                    Math.min(totalPages - 1, current + 1))}
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
