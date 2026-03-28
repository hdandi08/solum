import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import RiskBadge from '../components/RiskBadge'

// Monthly units consumed per subscription tier
// Only consumable products are refilled monthly
const KIT_COMPOSITION = {
  ground:    { '01': 1, '05': 1, '07': 1 },
  ritual:    { '01': 1, '05': 1, '06': 1, '07': 1 },
  sovereign: { '01': 1, '05': 1, '06': 1, '07': 1, '10': 1 },
}

function weeksToDate(weeks) {
  if (weeks === null || weeks === undefined) return null
  const d = new Date()
  d.setDate(d.getDate() + Math.round(weeks * 7))
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getRiskLevel(runway, stock) {
  if (stock === 0) return 'out_of_stock'
  if (runway === null) return 'ok'
  if (runway < 4) return 'critical'
  if (runway < 8) return 'low'
  return 'ok'
}

function calcBurnAndRunway(products, subs) {
  return products.map((p) => {
    const sku = p.product_number ? String(p.product_number) : null

    let totalBurn = 0
    if (sku) {
      for (const [tier, composition] of Object.entries(KIT_COMPOSITION)) {
        const unitsPerSub = composition[sku] || 0
        totalBurn += unitsPerSub * (subs[tier] || 0)
      }
    }

    const runwayWeeks = totalBurn > 0
      ? Math.floor((p.current_stock / totalBurn) * 4.33)
      : null

    return {
      ...p,
      sim_monthly_burn: totalBurn,
      sim_runway_weeks: runwayWeeks,
      sim_run_out_date: weeksToDate(runwayWeeks),
    }
  })
}

export default function ProjectionsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [simSubs, setSimSubs] = useState({ ground: '', ritual: '', sovereign: '' })
  const [simResults, setSimResults] = useState(null)

  const fetchData = useCallback(async () => {
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
      setData(json)
    } catch (err) {
      setError(err.message || 'Failed to load projections data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Run what-if simulation when sim inputs change
  useEffect(() => {
    if (!data?.products) return

    const ground = parseInt(simSubs.ground, 10) || 0
    const ritual = parseInt(simSubs.ritual, 10) || 0
    const sovereign = parseInt(simSubs.sovereign, 10) || 0

    if (ground === 0 && ritual === 0 && sovereign === 0) {
      setSimResults(null)
      return
    }

    const results = calcBurnAndRunway(data.products, { ground, ritual, sovereign })
    setSimResults(results)
  }, [simSubs, data])

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        Loading projections...
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="page-title">Projections</h1>
        <div className="error-state">{error}</div>
        <button className="btn btn-secondary" style={{ marginTop: '16px' }} onClick={fetchData}>
          Retry
        </button>
      </div>
    )
  }

  const {
    products = [],
    active_subscribers = 0,
    subscribers_by_kit = {},
  } = data || {}

  const groundCount = subscribers_by_kit?.ground || 0
  const ritualCount = subscribers_by_kit?.ritual || 0
  const sovereignCount = subscribers_by_kit?.sovereign || 0

  const hasSubscribers = active_subscribers > 0

  // Monthly burn table: compute for each product
  const burnData = products.map((p) => {
    const sku = p.product_number ? String(p.product_number) : null
    let groundBurn = 0, ritualBurn = 0, sovereignBurn = 0

    if (sku) {
      groundBurn = (KIT_COMPOSITION.ground[sku] || 0) * groundCount
      ritualBurn = (KIT_COMPOSITION.ritual[sku] || 0) * ritualCount
      sovereignBurn = (KIT_COMPOSITION.sovereign[sku] || 0) * sovereignCount
    }

    return {
      ...p,
      groundBurn,
      ritualBurn,
      sovereignBurn,
      totalBurn: groundBurn + ritualBurn + sovereignBurn,
    }
  })

  // Runway table
  const runwayData = products.map((p) => {
    const bd = burnData.find((b) => b.id === p.id) || {}
    const totalBurn = bd.totalBurn || 0
    const runwayWeeks = totalBurn > 0
      ? Math.floor((p.current_stock / totalBurn) * 4.33)
      : null
    const risk = getRiskLevel(runwayWeeks, p.current_stock)
    return {
      ...p,
      totalBurn,
      runwayWeeks,
      runOutDate: weeksToDate(runwayWeeks),
      risk,
    }
  })

  return (
    <div>
      <h1 className="page-title">Projections</h1>

      {/* Subscriber Breakdown */}
      <div className="section">
        <div className="section-title">Active Subscribers</div>
        <div className="info-note">
          Subscriber data updates automatically from Stripe.
        </div>
        <div className="projections-grid">
          <div className="card">
            <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--bone-muted)', marginBottom: '20px' }}>
              Subscribers by Kit
            </div>
            <div className="kit-breakdown">
              <div className="kit-row">
                <span className="kit-name">GROUND</span>
                <span className="kit-count">{groundCount}</span>
              </div>
              <div className="kit-row">
                <span className="kit-name">RITUAL</span>
                <span className="kit-count">{ritualCount}</span>
              </div>
              <div className="kit-row">
                <span className="kit-name">SOVEREIGN</span>
                <span className="kit-count">{sovereignCount}</span>
              </div>
              <div className="kit-row" style={{ borderTop: '1px solid var(--border)', marginTop: '4px', paddingTop: '12px', borderBottom: 'none' }}>
                <span style={{ fontWeight: 600, color: 'var(--bone)' }}>TOTAL</span>
                <span className="kit-count" style={{ color: 'var(--bone)' }}>{active_subscribers}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Burn */}
      <div className="section">
        <div className="section-title">Monthly Burn</div>
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Consumable?</th>
                  <th>Ground burn</th>
                  <th>Ritual burn</th>
                  <th>Sovereign burn</th>
                  <th>Total / month</th>
                </tr>
              </thead>
              <tbody>
                {burnData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="no-data">No products found.</td>
                  </tr>
                ) : (
                  burnData.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 500 }}>{p.name}</td>
                      <td>
                        {p.is_consumable ? (
                          <span style={{ color: 'var(--sky-blue)', fontSize: '12px', fontWeight: 600 }}>YES</span>
                        ) : (
                          <span style={{ color: 'var(--bone-muted)', fontSize: '12px' }}>No</span>
                        )}
                      </td>
                      <td style={{ color: p.groundBurn > 0 ? 'var(--bone)' : 'var(--bone-muted)' }}>
                        {p.groundBurn || '—'}
                      </td>
                      <td style={{ color: p.ritualBurn > 0 ? 'var(--bone)' : 'var(--bone-muted)' }}>
                        {p.ritualBurn || '—'}
                      </td>
                      <td style={{ color: p.sovereignBurn > 0 ? 'var(--bone)' : 'var(--bone-muted)' }}>
                        {p.sovereignBurn || '—'}
                      </td>
                      <td style={{ fontWeight: 600, color: p.totalBurn > 0 ? 'var(--bone)' : 'var(--bone-muted)' }}>
                        {p.totalBurn || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Runway Table */}
      <div className="section">
        <div className="section-title">Runway</div>

        {!hasSubscribers && (
          <div className="info-note">
            No subscribers yet — runway is infinite (no active burn). Add subscribers or use the what-if simulator below.
          </div>
        )}

        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Current Stock</th>
                  <th>Monthly Burn</th>
                  <th>Weeks Runway</th>
                  <th>Risk</th>
                  <th>Projected Run-out</th>
                </tr>
              </thead>
              <tbody>
                {runwayData.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{p.current_stock.toLocaleString()}</td>
                    <td style={{ color: p.totalBurn > 0 ? 'var(--bone)' : 'var(--bone-muted)' }}>
                      {p.totalBurn > 0 ? p.totalBurn : '—'}
                    </td>
                    <td style={{ color: p.totalBurn > 0 ? 'var(--bone)' : 'var(--bone-muted)' }}>
                      {p.totalBurn > 0 && p.runwayWeeks !== null ? `${p.runwayWeeks} wks` : '—'}
                    </td>
                    <td>
                      {p.totalBurn === 0 ? (
                        <span style={{ fontSize: '12px', color: 'var(--bone-muted)' }}>No burn</span>
                      ) : (
                        <RiskBadge level={p.risk} />
                      )}
                    </td>
                    <td className={p.totalBurn > 0 && p.runwayWeeks !== null && p.runwayWeeks < 8 ? 'run-out-soon' : 'run-out-ok'}>
                      {p.totalBurn > 0 && p.runOutDate ? p.runOutDate : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* What-if Simulator */}
      <div className="section">
        <div className="section-title">What-if Simulator</div>
        <div className="simulator-card">
          <div style={{ fontSize: '13px', color: 'var(--bone-dim)', marginBottom: '20px' }}>
            Simulate burn and runway with custom subscriber counts. Useful for planning before subscribers arrive.
          </div>
          <div className="simulator-inputs">
            <div className="form-group">
              <label className="form-label">GROUND subscribers</label>
              <input
                type="number"
                className="input"
                placeholder="0"
                min="0"
                value={simSubs.ground}
                onChange={(e) => setSimSubs({ ...simSubs, ground: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">RITUAL subscribers</label>
              <input
                type="number"
                className="input"
                placeholder="0"
                min="0"
                value={simSubs.ritual}
                onChange={(e) => setSimSubs({ ...simSubs, ritual: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">SOVEREIGN subscribers</label>
              <input
                type="number"
                className="input"
                placeholder="0"
                min="0"
                value={simSubs.sovereign}
                onChange={(e) => setSimSubs({ ...simSubs, sovereign: e.target.value })}
              />
            </div>
          </div>

          {simResults ? (
            <div>
              <div className="section-title" style={{ marginBottom: '12px' }}>Simulated Runway</div>
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Current Stock</th>
                      <th>Sim Monthly Burn</th>
                      <th>Sim Weeks Runway</th>
                      <th>Risk</th>
                      <th>Sim Run-out Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simResults.map((p) => {
                      const risk = getRiskLevel(p.sim_runway_weeks, p.current_stock)
                      return (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 500 }}>{p.name}</td>
                          <td style={{ fontVariantNumeric: 'tabular-nums' }}>{p.current_stock.toLocaleString()}</td>
                          <td style={{ color: p.sim_monthly_burn > 0 ? 'var(--bone)' : 'var(--bone-muted)' }}>
                            {p.sim_monthly_burn > 0 ? p.sim_monthly_burn : '—'}
                          </td>
                          <td style={{ color: p.sim_monthly_burn > 0 ? 'var(--bone)' : 'var(--bone-muted)' }}>
                            {p.sim_monthly_burn > 0 && p.sim_runway_weeks !== null
                              ? `${p.sim_runway_weeks} wks`
                              : '—'}
                          </td>
                          <td>
                            {p.sim_monthly_burn === 0 ? (
                              <span style={{ fontSize: '12px', color: 'var(--bone-muted)' }}>No burn</span>
                            ) : (
                              <RiskBadge level={risk} />
                            )}
                          </td>
                          <td className={p.sim_monthly_burn > 0 && p.sim_runway_weeks !== null && p.sim_runway_weeks < 8 ? 'run-out-soon' : 'run-out-ok'}>
                            {p.sim_monthly_burn > 0 && p.sim_run_out_date ? p.sim_run_out_date : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: 'var(--bone-muted)', padding: '20px 0' }}>
              Enter subscriber counts above to simulate runway.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
