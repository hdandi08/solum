import { useState, useEffect, useCallback } from 'react'
import { useEnv } from '../context/EnvContext'

const KIT_MONTHLY_PENCE = { ground: 3800, ritual: 4800, sovereign: 5800 }
const CADENCE_MONTHS = { monthly: 1, quarterly: 3, biannual: 6, first_box_only: null }

function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function pence(p) {
  return `£${((p || 0) / 100).toFixed(0)}`
}

function PaymentStatusBadge({ status }) {
  const map = {
    active:   { cls: 'ok',       label: 'Active' },
    past_due: { cls: 'low',      label: 'Past Due' },
    unpaid:   { cls: 'critical', label: 'Unpaid' },
    cancelled:{ cls: 'no-data',  label: 'Cancelled' },
  }
  const { cls, label } = map[status] || { cls: 'no-data', label: status }
  return <span className={`risk-badge ${cls}`}>{label}</span>
}

export default function DashboardPage() {
  const { config } = useEnv()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [stats, setStats] = useState({ activeSubs: 0, pendingOrders: 0, openIssues: 0, mrr: 0 })
  const [inventory, setInventory] = useState({ ground: 0, ritual: 0 })
  const [inventoryInputs, setInventoryInputs] = useState({ ground: 0, ritual: 0 })
  const [savingKit, setSavingKit] = useState(null)
  const [stockHealth, setStockHealth] = useState([])
  const [recentOrders, setRecentOrders] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [
        { count: activeSubs },
        { count: pendingOrders },
        { count: openIssues },
        { data: subsByKit },
        { data: kitInv },
        { data: products },
        { data: kitProducts },
        { data: orders },
      ] = await Promise.all([
        config.client.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        config.client.from('orders').select('*', { count: 'exact', head: true }).eq('dispatch_status', 'pending'),
        config.client.from('payment_issues').select('*', { count: 'exact', head: true }).eq('resolved', false),
        config.client.from('subscriptions').select('kit_id').eq('status', 'active'),
        config.client.from('kit_inventory').select('*'),
        config.client.from('products').select('id, name, current_stock').like('id', 'product-%').order('id'),
        config.client.from('kit_products').select('kit_id, product_id, refill_qty, refill_cadence').in('kit_id', ['ground', 'ritual']),
        config.client.from('orders').select('*, customers(first_name, last_name, email)').order('created_at', { ascending: false }).limit(6),
      ])

      const mrr = (subsByKit || []).reduce((s, sub) => s + (KIT_MONTHLY_PENCE[sub.kit_id] || 0), 0)
      setStats({ activeSubs: activeSubs || 0, pendingOrders: pendingOrders || 0, openIssues: openIssues || 0, mrr })

      const inv = { ground: 0, ritual: 0 }
      for (const row of kitInv || []) { inv[row.kit_id] = row.available_count }
      setInventory(inv)
      setInventoryInputs({ ...inv })

      // Stock health: for each kit, find min runway across products
      const stockMap = Object.fromEntries((products || []).map(p => [p.id, p]))
      const subCountByKit = (subsByKit || []).reduce((acc, s) => { acc[s.kit_id] = (acc[s.kit_id] || 0) + 1; return acc }, {})

      const health = ['ground', 'ritual'].map(kitId => {
        const subs = subCountByKit[kitId] || 0
        const kps = (kitProducts || []).filter(kp => kp.kit_id === kitId && kp.refill_qty > 0)
        const rows = kps.map(kp => {
          const product = stockMap[kp.product_id]
          if (!product) return null
          const cadenceMonths = CADENCE_MONTHS[kp.refill_cadence]
          if (!cadenceMonths) return null
          const monthlyBurn = (kp.refill_qty * subs) / cadenceMonths
          const runwayWeeks = monthlyBurn > 0 ? Math.floor((product.current_stock / monthlyBurn) * 4.33) : null
          return { name: product.name, stock: product.current_stock, monthlyBurn: Math.ceil(monthlyBurn), runwayWeeks }
        }).filter(Boolean)

        const minRunway = rows.reduce((min, r) => r.runwayWeeks !== null ? Math.min(min, r.runwayWeeks) : min, Infinity)
        return { kitId, subs, rows, minRunway: minRunway === Infinity ? null : minRunway }
      })

      setStockHealth(health)
      setRecentOrders(orders || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [config])

  useEffect(() => { load() }, [load])

  async function saveKit(kitId) {
    setSavingKit(kitId)
    try {
      const { error: err } = await config.client
        .from('kit_inventory')
        .update({ available_count: Number(inventoryInputs[kitId]), updated_at: new Date().toISOString() })
        .eq('kit_id', kitId)
      if (err) throw err
      setInventory(p => ({ ...p, [kitId]: Number(inventoryInputs[kitId]) }))
    } catch (err) {
      alert(err.message)
    } finally {
      setSavingKit(null)
    }
  }

  if (loading) return <div className="loading-state"><div className="loading-spinner" />Loading...</div>
  if (error) return <div className="error-state">{error} <button className="btn btn-secondary btn-sm" style={{ marginLeft: 12 }} onClick={load}>Retry</button></div>

  const runwayColor = (w) => w === null ? 'var(--bone-muted)' : w < 4 ? 'var(--critical)' : w < 10 ? 'var(--low)' : 'var(--ok)'

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>

      {/* Stats */}
      <div className="stat-cards" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 32 }}>
        <div className="stat-card">
          <div className="stat-value">{stats.activeSubs}</div>
          <div className="stat-label">Active Subscribers</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--sky-blue)' }}>£{((stats.mrr) / 100).toFixed(0)}</div>
          <div className="stat-label">MRR</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: stats.pendingOrders > 0 ? 'var(--low)' : 'var(--bone)' }}>{stats.pendingOrders}</div>
          <div className="stat-label">Pending Dispatch</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: stats.openIssues > 0 ? 'var(--critical)' : 'var(--bone)' }}>{stats.openIssues}</div>
          <div className="stat-label">Payment Issues</div>
        </div>
      </div>

      {/* Kit Availability */}
      <div className="section-title">Kit Availability</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
        {['ground', 'ritual'].map(kitId => {
          const health = stockHealth.find(h => h.kitId === kitId)
          const minRunway = health?.minRunway
          return (
            <div key={kitId} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: 22, letterSpacing: '0.1em', color: 'var(--bone)' }}>
                    {kitId.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--bone-muted)', marginTop: 2 }}>
                    {health?.subs || 0} active subscribers
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--bone-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Stock advisory</div>
                  <div style={{ fontSize: 18, fontFamily: 'Bebas Neue', color: runwayColor(minRunway) }}>
                    {minRunway !== null ? `${minRunway} wks` : '—'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--bone-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                    Available boxes
                  </div>
                  <input
                    type="number"
                    min={0}
                    className="input"
                    value={inventoryInputs[kitId]}
                    onChange={e => setInventoryInputs(p => ({ ...p, [kitId]: e.target.value }))}
                    style={{ width: '100%' }}
                  />
                </div>
                <button
                  className="btn btn-primary"
                  style={{ marginTop: 21, flexShrink: 0 }}
                  onClick={() => saveKit(kitId)}
                  disabled={savingKit === kitId || Number(inventoryInputs[kitId]) === inventory[kitId]}
                >
                  {savingKit === kitId ? '...' : 'Save'}
                </button>
              </div>
              {inventory[kitId] === 0 && (
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--critical)', fontWeight: 600 }}>
                  ⚠ Checkout blocked — set available boxes to open sales
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Stock Health Detail */}
      <div className="section-title">Stock Health by Kit</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
        {stockHealth.map(({ kitId, rows }) => (
          <div key={kitId} className="card" style={{ padding: 0 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bone-muted)' }}>
              {kitId} · consumable products
            </div>
            <table className="table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Stock</th>
                  <th>Burn/mo</th>
                  <th>Runway</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={4} className="no-data" style={{ padding: 20 }}>No data — set subscriber count first</td></tr>
                ) : rows.map(r => (
                  <tr key={r.name}>
                    <td style={{ fontWeight: 500 }}>{r.name}</td>
                    <td>{r.stock}</td>
                    <td style={{ color: 'var(--bone-muted)' }}>{r.monthlyBurn || '—'}</td>
                    <td style={{ color: runwayColor(r.runwayWeeks), fontWeight: 600 }}>
                      {r.runwayWeeks !== null ? `${r.runwayWeeks}w` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="section-title">Recent Orders</div>
      <div className="card" style={{ padding: 0 }}>
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
              <tr><td colSpan={6} className="no-data">No orders yet.</td></tr>
            ) : recentOrders.map(o => (
              <tr key={o.id}>
                <td style={{ fontSize: 13, color: 'var(--bone-muted)', whiteSpace: 'nowrap' }}>{fmt(o.created_at)}</td>
                <td>
                  <div style={{ fontWeight: 500 }}>
                    {[o.customers?.first_name, o.customers?.last_name].filter(Boolean).join(' ') || '—'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--bone-muted)' }}>{o.customers?.email}</div>
                </td>
                <td style={{ textTransform: 'uppercase', fontSize: 13, letterSpacing: '0.05em' }}>{o.kit_id}</td>
                <td>
                  <span className={`type-badge ${o.order_type === 'first_box' ? 'inbound' : 'outbound_order'}`}>
                    {o.order_type === 'first_box' ? 'First Box' : 'Refill'}
                  </span>
                </td>
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>{pence(o.amount_pence)}</td>
                <td>
                  <span className={`risk-badge ${o.dispatch_status === 'pending' ? 'low' : 'ok'}`}>
                    {o.dispatch_status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
