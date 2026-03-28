import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import RiskBadge from '../components/RiskBadge'

function getRiskLevel(runway, stock) {
  if (stock === 0) return 'out_of_stock'
  if (runway === null) return 'ok'
  if (runway < 4) return 'critical'
  if (runway < 8) return 'low'
  return 'ok'
}

const ADJUSTMENT_TYPES = [
  { value: 'adjustment', label: 'Manual Adjustment' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'adjustment', label: 'Count Correction' },
]

export default function InventoryPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [activeAdjust, setActiveAdjust] = useState(null) // product id
  const [adjustForm, setAdjustForm] = useState({
    type: 'adjustment',
    quantity: '',
    notes: '',
  })
  const [adjusting, setAdjusting] = useState(false)
  const [adjustError, setAdjustError] = useState('')

  const fetchProducts = useCallback(async () => {
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
      setProducts(json.products || [])
    } catch (err) {
      setError(err.message || 'Failed to load inventory data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const openAdjust = (productId) => {
    if (activeAdjust === productId) {
      setActiveAdjust(null)
      setAdjustError('')
    } else {
      setActiveAdjust(productId)
      setAdjustForm({ type: 'adjustment', quantity: '', notes: '' })
      setAdjustError('')
    }
  }

  const handleAdjustSubmit = async (e, productId) => {
    e.preventDefault()
    const qty = parseInt(adjustForm.quantity, 10)
    if (isNaN(qty) || qty === 0) {
      setAdjustError('Quantity must be a non-zero number. Use negative to remove stock.')
      return
    }

    setAdjusting(true)
    setAdjustError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-adjust-stock`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            product_id: productId,
            transaction_type: adjustForm.type,
            quantity: qty,
            notes: adjustForm.notes || null,
          }),
        }
      )

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `Adjustment failed (${response.status})`)
      }

      setActiveAdjust(null)
      await fetchProducts()
    } catch (err) {
      setAdjustError(err.message || 'Adjustment failed. Please try again.')
    } finally {
      setAdjusting(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        Loading inventory...
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="page-title">Inventory</h1>
        <div className="error-state">{error}</div>
        <button className="btn btn-secondary" style={{ marginTop: '16px' }} onClick={fetchProducts}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <div>
      <h1 className="page-title">Inventory</h1>

      <div className="section">
        <div className="section-title">Stock Levels</div>
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Current Stock</th>
                  <th>Unit Cost</th>
                  <th>Consumable?</th>
                  <th>Reorder at (wks)</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="no-data">No products found.</td>
                  </tr>
                ) : (
                  products.map((p, idx) => {
                    const risk = getRiskLevel(p.runway_weeks, p.current_stock)
                    const isOpen = activeAdjust === p.id
                    return (
                      <>
                        <tr key={p.id} style={isOpen ? { background: 'var(--surface-hover)' } : {}}>
                          <td style={{ color: 'var(--bone-muted)', fontVariantNumeric: 'tabular-nums' }}>
                            {String(idx + 1).padStart(2, '0')}
                          </td>
                          <td style={{ fontWeight: 500 }}>{p.name}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--bone-dim)' }}>
                            {p.sku || '—'}
                          </td>
                          <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {p.current_stock.toLocaleString()}
                          </td>
                          <td>
                            {p.unit_cost != null ? `£${Number(p.unit_cost).toFixed(2)}` : '—'}
                          </td>
                          <td>
                            {p.is_consumable ? (
                              <span style={{ color: 'var(--sky-blue)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em' }}>YES</span>
                            ) : (
                              <span style={{ color: 'var(--bone-muted)', fontSize: '12px' }}>No</span>
                            )}
                          </td>
                          <td>
                            {p.reorder_at_weeks != null ? `${p.reorder_at_weeks} wks` : '—'}
                          </td>
                          <td>
                            {p.monthly_burn === 0 ? (
                              <span style={{ fontSize: '12px', color: 'var(--bone-muted)' }}>No data</span>
                            ) : (
                              <RiskBadge level={risk} />
                            )}
                          </td>
                          <td>
                            <button
                              className={`btn btn-sm ${isOpen ? 'btn-secondary' : 'btn-primary'}`}
                              onClick={() => openAdjust(p.id)}
                            >
                              {isOpen ? 'Cancel' : 'Adjust'}
                            </button>
                          </td>
                        </tr>

                        {isOpen && (
                          <tr key={`${p.id}-adjust`}>
                            <td colSpan={9} style={{ padding: 0 }}>
                              <div className="inline-form">
                                <div style={{ fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--bone-dim)', marginBottom: '16px' }}>
                                  Adjust stock — {p.name}
                                </div>

                                {adjustError && (
                                  <div className="error-state" style={{ marginBottom: '16px' }}>
                                    {adjustError}
                                  </div>
                                )}

                                <form onSubmit={(e) => handleAdjustSubmit(e, p.id)}>
                                  <div className="form-grid" style={{ marginBottom: '16px' }}>
                                    <div className="form-group">
                                      <label className="form-label">Type</label>
                                      <select
                                        className="select"
                                        value={adjustForm.type}
                                        onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value })}
                                      >
                                        <option value="adjustment">Manual Adjustment</option>
                                        <option value="damaged">Damaged</option>
                                        <option value="adjustment">Count Correction</option>
                                      </select>
                                    </div>

                                    <div className="form-group">
                                      <label className="form-label">Quantity</label>
                                      <input
                                        type="number"
                                        className="input"
                                        placeholder="+50 or -10"
                                        value={adjustForm.quantity}
                                        onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                                        required
                                      />
                                      <span style={{ fontSize: '11px', color: 'var(--bone-muted)' }}>
                                        Positive = add stock · Negative = remove stock
                                      </span>
                                    </div>

                                    <div className="form-group">
                                      <label className="form-label">Notes</label>
                                      <input
                                        type="text"
                                        className="input"
                                        placeholder="Optional notes..."
                                        value={adjustForm.notes}
                                        onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                                      />
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', gap: '10px' }}>
                                    <button type="submit" className="btn btn-primary" disabled={adjusting}>
                                      {adjusting ? 'Saving...' : 'Save Adjustment'}
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-secondary"
                                      onClick={() => setActiveAdjust(null)}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </form>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
