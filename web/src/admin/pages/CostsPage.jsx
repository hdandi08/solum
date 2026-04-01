import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

// ── Kit definitions (mirrors seed data) ────────────────────────────────────
// first_box: all product_ids shipped in first box
// refill: product_ids shipped every month
const KITS = {
  ground: {
    label: 'GROUND',
    rrp: 55,
    sub_price: 38,
    first_box: ['product-01', 'product-02', 'product-03', 'product-04', 'product-05', 'product-07', 'product-08'],
    refill:    ['product-01', 'product-05', 'product-07'],
  },
  ritual: {
    label: 'RITUAL',
    rrp: 85,
    sub_price: 48,
    first_box: ['product-01', 'product-02', 'product-03', 'product-04', 'product-05', 'product-06', 'product-07', 'product-08'],
    refill:    ['product-01', 'product-05', 'product-06', 'product-07'],
  },
  sovereign: {
    label: 'SOVEREIGN',
    rrp: 130,
    sub_price: 58,
    first_box: ['product-01', 'product-03', 'product-04', 'product-05', 'product-06', 'product-07', 'product-08', 'product-09', 'product-10'],
    refill:    ['product-01', 'product-05', 'product-06', 'product-07', 'product-10'],
  },
}

const POSTAGE = 3.85  // Royal Mail Tracked 48

function pence(p) { return (p || 0) / 100 }
function gbp(v)   { return `£${Number(v).toFixed(2)}` }
function pct(v)   { return `${Number(v).toFixed(1)}%` }

function formatDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function landedPerUnit(order) {
  const total = order.unit_cost_pence * order.quantity
    + (order.vat_pence || 0)
    + (order.customs_duty_pence || 0)
    + (order.shipping_cost_pence || 0)
  return pence(total) / order.quantity
}

function MarginCell({ gp, rev }) {
  if (gp == null || rev == null) return <td style={{ color: 'var(--bone-muted)' }}>—</td>
  const m = (gp / rev) * 100
  const color = m >= 60 ? 'var(--ok)' : m >= 30 ? 'var(--bone)' : 'var(--critical)'
  return <td style={{ color, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{pct(m)}</td>
}

function GpCell({ gp }) {
  if (gp == null) return <td style={{ color: 'var(--bone-muted)' }}>—</td>
  const color = gp >= 0 ? 'var(--ok)' : 'var(--critical)'
  return <td style={{ color, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{gbp(gp)}</td>
}

function SummaryCard({ label, value, sub }) {
  return (
    <div className="card" style={{ flex: '1 1 150px', minWidth: 0 }}>
      <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--bone-dim)', marginBottom: '8px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--bone)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: 'var(--bone-muted)', marginTop: '4px' }}>{sub}</div>}
    </div>
  )
}

function TrendArrow({ prev, curr }) {
  if (prev == null || curr == null) return <span style={{ color: 'var(--bone-muted)' }}>—</span>
  const diff = curr - prev
  if (Math.abs(diff) < 0.001) return <span style={{ color: 'var(--bone-muted)', fontSize: '12px' }}>—</span>
  if (diff < 0) return <span style={{ color: 'var(--ok)', fontSize: '12px' }}>▼ {gbp(Math.abs(diff))}</span>
  return <span style={{ color: 'var(--critical)', fontSize: '12px' }}>▲ {gbp(diff)}</span>
}

export default function CostsPage() {
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error: err } = await supabase
        .from('supplier_orders')
        .select('*, products(id, name, sku)')
        .order('order_date', { ascending: true })
      if (err) throw err
      setOrders(data || [])
    } catch (e) {
      setError(e.message || 'Failed to load cost data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  if (loading) return <div className="loading-state"><div className="loading-spinner" />Loading costs...</div>
  if (error) return (
    <div>
      <h1 className="page-title">Costs</h1>
      <div className="error-state">{error}</div>
      <button className="btn btn-secondary" style={{ marginTop: '16px' }} onClick={fetchOrders}>Retry</button>
    </div>
  )

  const delivered = orders.filter(o => o.status === 'delivered')

  // ── Spend totals ────────────────────────────────────────────────────────
  const totalCogs     = delivered.reduce((s, o) => s + pence(o.unit_cost_pence * o.quantity), 0)
  const totalVat      = delivered.reduce((s, o) => s + pence(o.vat_pence), 0)
  const totalCustoms  = delivered.reduce((s, o) => s + pence(o.customs_duty_pence), 0)
  const totalShipping = delivered.reduce((s, o) => s + pence(o.shipping_cost_pence), 0)
  const totalLanded   = totalCogs + totalVat + totalCustoms + totalShipping

  // ── Blended landed cost per product (weighted avg across delivered orders) ─
  const byProduct = {}
  for (const o of delivered) {
    const pid = o.product_id
    if (!byProduct[pid]) byProduct[pid] = { name: o.products?.name || pid, orders: [] }
    byProduct[pid].orders.push(o)
  }

  const blended = {}  // product_id → landed £/unit
  for (const [pid, { orders: pos }] of Object.entries(byProduct)) {
    const totalUnits = pos.reduce((s, o) => s + o.quantity, 0)
    const totalSpend = pos.reduce((s, o) => s + pence(
      o.unit_cost_pence * o.quantity + o.vat_pence + o.customs_duty_pence + o.shipping_cost_pence
    ), 0)
    blended[pid] = totalUnits > 0 ? totalSpend / totalUnits : 0
  }

  // ── Kit P&L calculations ─────────────────────────────────────────────────
  function kitCogs(productList) {
    let total = 0
    let hasData = true
    for (const pid of productList) {
      if (blended[pid] == null) { hasData = false; break }
      total += blended[pid]
    }
    return hasData ? total : null
  }

  const kitRows = Object.entries(KITS).map(([kitId, kit]) => {
    const firstBoxCogs   = kitCogs(kit.first_box)
    const monthlyRefCogs = kitCogs(kit.refill)

    // First box: one-time sale
    const firstBoxTotal  = firstBoxCogs != null ? firstBoxCogs + POSTAGE : null
    const firstBoxGp     = firstBoxTotal != null ? kit.rrp - firstBoxTotal : null

    // Monthly sub
    const monthlyTotal   = monthlyRefCogs != null ? monthlyRefCogs + POSTAGE : null
    const monthlyGp      = monthlyTotal != null ? kit.sub_price - monthlyTotal : null

    // Quarterly sub (3 months)
    const quarterlyRev   = kit.sub_price * 3
    const quarterlyTotal = monthlyTotal != null ? monthlyTotal * 3 : null
    const quarterlyGp    = quarterlyTotal != null ? quarterlyRev - quarterlyTotal : null

    return { kitId, kit, firstBoxTotal, firstBoxGp, monthlyTotal, monthlyGp, quarterlyRev, quarterlyTotal, quarterlyGp, monthlyRefCogs }
  })

  // ── Per-product stats for trend table ───────────────────────────────────
  const productStats = Object.entries(byProduct).map(([pid, { name, orders: pos }]) => {
    const sorted     = [...pos].sort((a, b) => new Date(a.order_date) - new Date(b.order_date))
    const totalUnits = sorted.reduce((s, o) => s + o.quantity, 0)
    const totalSpend = sorted.reduce((s, o) => s + pence(o.unit_cost_pence * o.quantity + o.vat_pence + o.customs_duty_pence + o.shipping_cost_pence), 0)
    return { pid, name, totalUnits, totalSpend, blendedLanded: blended[pid], orders: sorted }
  }).sort((a, b) => a.pid.localeCompare(b.pid))

  return (
    <div>
      <h1 className="page-title">Costs</h1>

      {/* ── Spend summary ───────────────────────────────── */}
      <div className="section">
        <div className="section-title">Actual Spend to Date — Delivered Orders</div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <SummaryCard label="Total landed spend" value={gbp(totalLanded)} sub={`${delivered.length} orders`} />
          <SummaryCard label="Product COGS" value={gbp(totalCogs)} />
          <SummaryCard label="VAT paid" value={gbp(totalVat)} />
          <SummaryCard label="Customs duty" value={gbp(totalCustoms)} />
          <SummaryCard label="Shipping / freight" value={gbp(totalShipping)} />
        </div>
      </div>

      {/* ── Kit P&L ─────────────────────────────────────── */}
      <div className="section">
        <div className="section-title">Kit P&amp;L — First Box · Monthly · Quarterly</div>
        <div style={{ fontSize: '12px', color: 'var(--bone-muted)', marginBottom: '12px' }}>
          Based on blended landed cost per product + £3.85 postage. Updates as you log delivered orders.
        </div>
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th rowSpan={2} style={{ verticalAlign: 'bottom', borderRight: '1px solid var(--border)' }}>Kit</th>
                  <th colSpan={3} style={{ textAlign: 'center', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', color: 'var(--sky-blue)', fontSize: '11px', letterSpacing: '0.1em' }}>FIRST BOX (one-time)</th>
                  <th colSpan={3} style={{ textAlign: 'center', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', color: 'var(--bone-dim)', fontSize: '11px', letterSpacing: '0.1em' }}>MONTHLY SUB</th>
                  <th colSpan={3} style={{ textAlign: 'center', borderBottom: '1px solid var(--border)', color: 'var(--bone-dim)', fontSize: '11px', letterSpacing: '0.1em' }}>QUARTERLY SUB (×3)</th>
                </tr>
                <tr>
                  <th style={{ color: 'var(--bone-muted)' }}>Revenue</th>
                  <th style={{ color: 'var(--bone-muted)' }}>COGS</th>
                  <th style={{ color: 'var(--bone-muted)', borderRight: '1px solid var(--border)' }}>Margin</th>
                  <th style={{ color: 'var(--bone-muted)' }}>Revenue</th>
                  <th style={{ color: 'var(--bone-muted)' }}>COGS</th>
                  <th style={{ color: 'var(--bone-muted)', borderRight: '1px solid var(--border)' }}>Margin</th>
                  <th style={{ color: 'var(--bone-muted)' }}>Revenue</th>
                  <th style={{ color: 'var(--bone-muted)' }}>COGS</th>
                  <th style={{ color: 'var(--bone-muted)' }}>Margin</th>
                </tr>
              </thead>
              <tbody>
                {kitRows.map(({ kitId, kit, firstBoxTotal, firstBoxGp, monthlyTotal, monthlyGp, quarterlyRev, quarterlyTotal, quarterlyGp }) => (
                  <tr key={kitId}>
                    <td style={{ fontWeight: 700, letterSpacing: '0.08em', borderRight: '1px solid var(--border)' }}>{kit.label}</td>

                    {/* First box */}
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{gbp(kit.rrp)}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--bone-muted)' }}>
                      {firstBoxTotal != null ? gbp(firstBoxTotal) : '—'}
                    </td>
                    <MarginCell gp={firstBoxGp} rev={kit.rrp} />

                    {/* Monthly */}
                    <td style={{ fontVariantNumeric: 'tabular-nums', borderLeft: '1px solid var(--border)' }}>{gbp(kit.sub_price)}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--bone-muted)' }}>
                      {monthlyTotal != null ? gbp(monthlyTotal) : '—'}
                    </td>
                    <MarginCell gp={monthlyGp} rev={kit.sub_price} />

                    {/* Quarterly */}
                    <td style={{ fontVariantNumeric: 'tabular-nums', borderLeft: '1px solid var(--border)' }}>{gbp(quarterlyRev)}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--bone-muted)' }}>
                      {quarterlyTotal != null ? gbp(quarterlyTotal) : '—'}
                    </td>
                    <MarginCell gp={quarterlyGp} rev={quarterlyRev} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* COGS breakdown per kit */}
        <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {kitRows.map(({ kitId, kit, monthlyRefCogs }) => (
            <div key={kitId} className="card" style={{ flex: '1 1 220px', minWidth: 0 }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--bone-dim)', marginBottom: '12px' }}>
                {kit.label} — refill breakdown
              </div>
              {kit.refill.map(pid => (
                <div key={pid} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--bone-muted)' }}>{byProduct[pid]?.name || pid}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {blended[pid] != null ? gbp(blended[pid]) : <span style={{ color: 'var(--bone-muted)' }}>no data</span>}
                  </span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border)', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--bone-muted)' }}>Postage</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{gbp(POSTAGE)}</span>
              </div>
              {monthlyRefCogs != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, marginTop: '6px' }}>
                  <span>Total</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--sky-blue)' }}>{gbp(monthlyRefCogs + POSTAGE)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Per-product cost trend ───────────────────────── */}
      <div className="section">
        <div className="section-title">Per-Product Landed Cost</div>
        <div style={{ fontSize: '12px', color: 'var(--bone-muted)', marginBottom: '12px' }}>
          Landed cost = (unit cost × qty + VAT + customs + shipping) ÷ qty. Trend shows change vs previous order.
        </div>

        {productStats.length === 0 ? (
          <div className="card">
            <p style={{ color: 'var(--bone-muted)', fontSize: '13px' }}>No delivered orders yet. Mark orders as delivered on the Replenishment page.</p>
          </div>
        ) : (
          productStats.map(({ pid, name, totalUnits, totalSpend, blendedLanded, orders: pos }) => (
            <div key={pid} className="card" style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: '15px' }}>{name}</span>
                <span style={{ fontSize: '13px', color: 'var(--bone-muted)' }}>{totalUnits.toLocaleString()} units · {gbp(totalSpend)} total spend</span>
                <span style={{ fontSize: '13px', color: 'var(--sky-blue)', fontWeight: 600 }}>
                  blended {gbp(blendedLanded)}/unit
                </span>
              </div>
              <div className="table-wrapper">
                <table className="table" style={{ fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Supplier</th>
                      <th>Qty</th>
                      <th>Unit Cost</th>
                      <th>VAT</th>
                      <th>Customs</th>
                      <th>Shipping</th>
                      <th>Landed / unit</th>
                      <th>vs Previous</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pos.map((o, i) => {
                      const lc   = landedPerUnit(o)
                      const prev = i > 0 ? landedPerUnit(pos[i - 1]) : null
                      return (
                        <tr key={o.id}>
                          <td>{formatDate(o.actual_delivery_date || o.order_date)}</td>
                          <td style={{ color: 'var(--bone-dim)' }}>{o.supplier_name}</td>
                          <td style={{ fontVariantNumeric: 'tabular-nums' }}>{o.quantity.toLocaleString()}</td>
                          <td>{gbp(pence(o.unit_cost_pence))}</td>
                          <td>{o.vat_pence            ? gbp(pence(o.vat_pence))            : <span style={{ color: 'var(--bone-muted)' }}>—</span>}</td>
                          <td>{o.customs_duty_pence   ? gbp(pence(o.customs_duty_pence))   : <span style={{ color: 'var(--bone-muted)' }}>—</span>}</td>
                          <td>{o.shipping_cost_pence  ? gbp(pence(o.shipping_cost_pence))  : <span style={{ color: 'var(--bone-muted)' }}>—</span>}</td>
                          <td style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{gbp(lc)}</td>
                          <td><TrendArrow prev={prev} curr={lc} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                  {pos.length > 1 && (
                    <tfoot>
                      <tr style={{ borderTop: '1px solid var(--border)' }}>
                        <td colSpan={7} style={{ color: 'var(--bone-dim)', fontSize: '12px', paddingTop: '10px' }}>Blended</td>
                        <td style={{ fontWeight: 700, color: 'var(--sky-blue)', paddingTop: '10px' }}>{gbp(blendedLanded)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── All orders log ───────────────────────────────── */}
      <div className="section">
        <div className="section-title">All Orders</div>
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Supplier</th>
                  <th>Qty</th>
                  <th>Unit Cost</th>
                  <th>VAT</th>
                  <th>Customs</th>
                  <th>Shipping</th>
                  <th>Total Landed</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr><td colSpan={10} className="no-data">No orders yet. Add orders on the Replenishment page.</td></tr>
                ) : (
                  [...orders].sort((a, b) => new Date(b.order_date) - new Date(a.order_date)).map(o => {
                    const total = pence(o.unit_cost_pence * o.quantity + o.vat_pence + o.customs_duty_pence + o.shipping_cost_pence)
                    return (
                      <tr key={o.id}>
                        <td>{formatDate(o.order_date)}</td>
                        <td style={{ fontWeight: 500 }}>{o.products?.name || o.product_id}</td>
                        <td style={{ color: 'var(--bone-dim)' }}>{o.supplier_name}</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>{o.quantity.toLocaleString()}</td>
                        <td>{gbp(pence(o.unit_cost_pence))}</td>
                        <td>{o.vat_pence           ? gbp(pence(o.vat_pence))           : <span style={{ color: 'var(--bone-muted)' }}>—</span>}</td>
                        <td>{o.customs_duty_pence  ? gbp(pence(o.customs_duty_pence))  : <span style={{ color: 'var(--bone-muted)' }}>—</span>}</td>
                        <td>{o.shipping_cost_pence ? gbp(pence(o.shipping_cost_pence)) : <span style={{ color: 'var(--bone-muted)' }}>—</span>}</td>
                        <td style={{ fontWeight: 600 }}>{gbp(total)}</td>
                        <td><span className={`status-badge ${o.status}`}>{o.status?.replace('_', ' ')}</span></td>
                      </tr>
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
