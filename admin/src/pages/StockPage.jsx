import { useState, useEffect, useCallback } from 'react'
import { useEnv } from '../context/EnvContext'

const CADENCE_LABELS = { monthly: 'Monthly', quarterly: 'Quarterly', biannual: '6-Month', first_box_only: 'First Box Only' }
const CADENCE_COLORS = { monthly: 'var(--sky-blue)', quarterly: 'var(--low)', biannual: 'var(--bone-muted)', first_box_only: 'var(--bone-muted)' }

export default function StockPage() {
  const { config } = useEnv()
  const [products, setProducts]   = useState([])
  const [packaging, setPackaging] = useState([])
  const [cadences, setCadences]   = useState({})
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [inputs, setInputs]       = useState({})
  const [saving, setSaving]       = useState(null)
  const [saved, setSaved]         = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [{ data: allProducts }, { data: kps }] = await Promise.all([
        config.client.from('products').select('*').eq('is_active', true).order('id'),
        config.client.from('kit_products').select('product_id, refill_cadence').not('refill_cadence', 'is', null),
      ])

      const productRows = (allProducts || []).filter(p => p.id.startsWith('product-'))
      const packagingRows = (allProducts || []).filter(p => !p.id.startsWith('product-'))

      // Deduplicate cadences per product (take from any kit — they're consistent)
      const cadenceMap = {}
      for (const kp of kps || []) {
        if (!cadenceMap[kp.product_id]) cadenceMap[kp.product_id] = kp.refill_cadence
      }

      setProducts(productRows)
      setPackaging(packagingRows)
      setCadences(cadenceMap)

      const initial = {}
      for (const p of [...productRows, ...packagingRows]) {
        initial[p.id] = String(p.current_stock)
      }
      setInputs(initial)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [config])

  useEffect(() => { load() }, [load])

  async function saveStock(productId) {
    setSaving(productId)
    try {
      const newStock = parseInt(inputs[productId], 10)
      if (isNaN(newStock) || newStock < 0) throw new Error('Invalid stock value')
      const { error: err } = await config.client.from('products').update({ current_stock: newStock }).eq('id', productId)
      if (err) throw err
      setProducts(p => p.map(x => x.id === productId ? { ...x, current_stock: newStock } : x))
      setPackaging(p => p.map(x => x.id === productId ? { ...x, current_stock: newStock } : x))
      setSaved(productId)
      setTimeout(() => setSaved(s => s === productId ? null : s), 1500)
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(null)
    }
  }

  function StockRow({ product, showCadence = false }) {
    const isDirty = inputs[product.id] !== String(product.current_stock)
    const isSaving = saving === product.id
    const isSaved = saved === product.id
    const stock = product.current_stock
    const stockColor = stock === 0 ? 'var(--critical)' : stock < 20 ? 'var(--low)' : 'var(--bone)'

    return (
      <tr>
        <td>
          <div style={{ fontWeight: 500 }}>{product.name}</div>
          <div style={{ fontSize: 11, color: 'var(--bone-muted)', marginTop: 2, fontFamily: 'monospace' }}>{product.sku}</div>
        </td>
        {showCadence && (
          <td>
            {cadences[product.id] ? (
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: CADENCE_COLORS[cadences[product.id]] }}>
                {CADENCE_LABELS[cadences[product.id]]}
              </span>
            ) : (
              <span style={{ fontSize: 11, color: 'var(--bone-muted)' }}>—</span>
            )}
          </td>
        )}
        <td style={{ color: stockColor, fontFamily: 'Bebas Neue', fontSize: 22, letterSpacing: '0.05em' }}>
          {stock}
        </td>
        <td>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="number"
              min={0}
              className="input"
              style={{ width: 90, padding: '5px 10px', fontSize: 13 }}
              value={inputs[product.id] ?? String(stock)}
              onChange={e => setInputs(p => ({ ...p, [product.id]: e.target.value }))}
            />
            <button
              className="btn btn-sm btn-primary"
              onClick={() => saveStock(product.id)}
              disabled={!isDirty || isSaving}
              style={{ minWidth: 56 }}
            >
              {isSaving ? '...' : isSaved ? '✓' : 'Save'}
            </button>
          </div>
        </td>
        {!showCadence && (
          <td style={{ fontSize: 12, color: 'var(--bone-muted)' }}>
            {product.unit_cost_pence > 0 ? `£${(product.unit_cost_pence / 100).toFixed(2)}` : '—'}
          </td>
        )}
      </tr>
    )
  }

  if (loading) return <div className="loading-state"><div className="loading-spinner" />Loading stock...</div>
  if (error) return <div className="error-state">{error} <button className="btn btn-secondary btn-sm" style={{ marginLeft: 12 }} onClick={load}>Retry</button></div>

  return (
    <div>
      <h1 className="page-title">Stock</h1>

      {/* Products */}
      <div className="section-title">Products</div>
      <div className="card" style={{ padding: 0, marginBottom: 32 }}>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Refill Cadence</th>
                <th>In Stock</th>
                <th>Update Stock</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr><td colSpan={4} className="no-data">No products found.</td></tr>
              ) : products.map(p => <StockRow key={p.id} product={p} showCadence />)}
            </tbody>
          </table>
        </div>
      </div>

      {/* Packaging */}
      <div className="section-title">Packaging</div>
      <div className="info-note" style={{ marginBottom: 16 }}>
        Packaging costs are recorded in Bookkeeping. This table tracks unit counts for dispatch planning only.
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th>In Stock</th>
                <th>Update Stock</th>
                <th>Unit Cost</th>
              </tr>
            </thead>
            <tbody>
              {packaging.length === 0 ? (
                <tr><td colSpan={4} className="no-data">No packaging items found.</td></tr>
              ) : packaging.map(p => <StockRow key={p.id} product={p} showCadence={false} />)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
