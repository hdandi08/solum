import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '../lib/adminClient'
import {
  buildOrderMutation,
  normalizeOrdersPayload,
  PAGE_SIZE,
  serializeOrderFilters,
} from '../features/orders/model'

const CARRIERS = [
  {
    value: 'royal-mail',
    label: 'Royal Mail',
    url: tracking =>
      `https://www.royalmail.com/track-your-item#/tracking-results/${tracking}`,
  },
  {
    value: 'evri',
    label: 'Evri',
    url: tracking =>
      `https://www.evri.com/track-a-parcel/results?trackingNumber=${tracking}`,
  },
  {
    value: 'dpd',
    label: 'DPD',
    url: tracking =>
      `https://www.dpd.co.uk/service/parcel-tracking/?parcelNumber=${tracking}`,
  },
  {
    value: 'dhl',
    label: 'DHL',
    url: tracking =>
      `https://www.dhl.com/en/express/tracking.html?AWB=${tracking}`,
  },
  {
    value: 'parcelforce',
    label: 'ParcelForce',
    url: tracking =>
      `https://www.parcelforce.com/track-trace?trackNum=${tracking}`,
  },
  { value: 'other', label: 'Other', url: null },
]

const PRODUCT_NAMES = {
  '01': 'Body Wash',
  '02': 'Italy Towel Mitt',
  '03': 'Back Scrub Cloth',
  '04': 'Scalp Massager',
  '05': 'Atlas Clay',
  '06': 'Body Oil',
  '07': 'Body Lotion',
  '08': 'Cleansing Cloth',
  '11': 'Clay Mixing Bowl',
}

const BOX_MANIFESTS = {
  GS: {
    label: 'GROUND Starter',
    products: ['01', '02', '03', '04', '05', '07', '08'],
  },
  RS: {
    label: 'RITUAL Starter',
    products: ['01', '02', '03', '04', '05', '06', '07', '08', '11'],
  },
  GR: {
    label: 'GROUND Refill',
    products: ['01', '02', '05', '07', '08'],
  },
  RR: {
    label: 'RITUAL Refill',
    products: ['01', '02', '05', '06', '07', '08'],
  },
  GR3: {
    label: 'GROUND Refill + Back Cloth',
    products: ['01', '02', '03', '05', '07', '08'],
  },
  RR3: {
    label: 'RITUAL Refill + Back Cloth',
    products: ['01', '02', '03', '05', '06', '07', '08'],
  },
  GR6: {
    label: 'GROUND Refill + Scalp',
    products: ['01', '02', '04', '05', '07', '08'],
  },
  RR6: {
    label: 'RITUAL Refill + Scalp',
    products: ['01', '02', '04', '05', '06', '07', '08'],
  },
}

function getBoxCode(order) {
  const kit = order.kit_id === 'ritual' ? 'R' : 'G'
  if (order.order_type === 'first_box') return `${kit}S`
  if (order.box_number === 3) return `${kit}R3`
  if (order.box_number === 6) return `${kit}R6`
  return `${kit}R`
}

function getDispatchDate(createdAt) {
  const date = new Date(createdAt)
  const day = date.getUTCDay()
  const beforeNoon = date.getUTCHours() < 12
  const daysToAdd = { 1: 3, 2: 2, 4: 4, 5: 3, 6: 2 }
  const add = day === 3
    ? beforeNoon ? 1 : 5
    : day === 0
      ? beforeNoon ? 1 : 4
      : daysToAdd[day]

  date.setUTCDate(date.getUTCDate() + add)
  return date.toISOString().slice(0, 10)
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatDispatchDate(date) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

function getCarrier(value) {
  return CARRIERS.find(carrier => carrier.value === value) ?? CARRIERS[0]
}

function TrackingLink({ carrier, tracking }) {
  const selected = getCarrier(carrier)
  const url = selected.url?.(tracking)
  return url ? (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: 'var(--sky-blue)',
        fontFamily: 'monospace',
        fontSize: 12,
      }}
    >
      {tracking}
    </a>
  ) : (
    <span
      style={{
        color: 'var(--bone-muted)',
        fontFamily: 'monospace',
        fontSize: 12,
      }}
    >
      {tracking}
    </span>
  )
}

function AddressBlock({ address }) {
  if (!address) {
    return (
      <span style={{ color: 'var(--bone-muted)', fontSize: 12 }}>
        No address on file
      </span>
    )
  }

  return (
    <div style={{ fontSize: 13, lineHeight: 1.7 }}>
      <div style={{ fontWeight: 500 }}>{address.name}</div>
      <div style={{ color: 'var(--bone-dim)' }}>
        {address.line1}{address.line2 ? `, ${address.line2}` : ''}
      </div>
      <div style={{ color: 'var(--bone-dim)' }}>
        {address.city}, {address.postcode}
      </div>
      {address.phone && (
        <div
          style={{
            color: 'var(--sky-blue)',
            fontSize: 12,
            marginTop: 2,
          }}
        >
          {address.phone}
        </div>
      )}
    </div>
  )
}

function BatchSummary({ batches }) {
  if (!batches.length) return null
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        marginBottom: 28,
      }}
    >
      {batches.map(batch => {
        const overdue = batch.date < today
        return (
          <div
            key={batch.date}
            className="card"
            style={{
              alignItems: 'center',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 28,
              padding: '14px 20px',
            }}
          >
            <div style={{ minWidth: 100 }}>
              {overdue && (
                <div
                  style={{
                    color: 'var(--critical)',
                    fontSize: 10,
                    letterSpacing: '0.15em',
                    marginBottom: 2,
                    textTransform: 'uppercase',
                  }}
                >
                  Overdue
                </div>
              )}
              <div
                style={{
                  color: overdue ? 'var(--critical)' : 'var(--bone)',
                  fontSize: 15,
                  fontWeight: 600,
                }}
              >
                {formatDispatchDate(batch.date)}
              </div>
            </div>
            <div style={{ minWidth: 60 }}>
              <div
                style={{
                  color: 'var(--bone-muted)',
                  fontSize: 11,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                Boxes
              </div>
              <div
                style={{
                  color: 'var(--sky-blue)',
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                {batch.total}
              </div>
            </div>
            <div
              style={{
                alignItems: 'center',
                display: 'flex',
                flex: 1,
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              {Object.entries(batch.codes).sort().map(([code, count]) => (
                <span
                  key={code}
                  style={{
                    background: 'rgba(74,143,199,0.1)',
                    border: '1px solid rgba(74,143,199,0.25)',
                    color: 'var(--sky-blue)',
                    fontFamily: 'monospace',
                    fontSize: 13,
                    fontWeight: 600,
                    padding: '3px 10px',
                  }}
                >
                  {count}× {code}
                </span>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function downloadLabel(pdfBase64) {
  const binary = atob(pdfBase64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  const url = URL.createObjectURL(new Blob([bytes], {
    type: 'application/pdf',
  }))
  window.open(url, '_blank', 'noopener,noreferrer')
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState({})
  const [inputs, setInputs] = useState({})
  const [saving, setSaving] = useState(null)
  const [saveError, setSaveError] = useState('')
  const [lastLabel, setLastLabel] = useState(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const payload = await adminApi.request('admin-orders', {
        body: serializeOrderFilters({
          page,
          typeFilter,
          statusFilter,
          search,
        }),
      })
      const normalized = normalizeOrdersPayload(payload)
      setOrders(normalized.rows)
      setBatches(normalized.dispatch_batches)
      setTotal(normalized.total_count)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, typeFilter])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  function getInput(id) {
    return inputs[id] ?? { tracking: '', carrier: 'royal-mail' }
  }

  function setInput(id, key, value) {
    setInputs(current => ({
      ...current,
      [id]: {
        ...getInput(id),
        [key]: value,
      },
    }))
  }

  async function mutateOrder(action, orderId, input = {}) {
    setSaving(orderId)
    setSaveError('')
    try {
      await adminApi.request('admin-orders', {
        method: 'PATCH',
        body: buildOrderMutation(action, orderId, input),
      })
      await fetchOrders()
    } catch (requestError) {
      setSaveError(requestError.message)
    } finally {
      setSaving(null)
    }
  }

  async function handleDispatch(order) {
    if (!window.confirm(
      'Mark this order dispatched with the entered carrier and tracking number?',
    )) return
    await mutateOrder('dispatch', order.id, getInput(order.id))
  }

  async function handleMarkDelivered(orderId) {
    if (!window.confirm('Mark this order as delivered?')) return
    await mutateOrder('deliver', orderId)
  }

  async function handleResetToPending(orderId) {
    if (!window.confirm(
      'Reset this order to pending? This clears its dispatch tracking fields. It does not cancel any carrier shipment or existing label.',
    )) return
    await mutateOrder('reset_pending', orderId)
  }

  async function handleCancel(orderId) {
    if (!window.confirm(
      'Cancel this order and issue a full refund? This cannot be undone.',
    )) return
    setSaving(orderId)
    setSaveError('')
    try {
      const result = await adminApi.request('cancel-order', {
        body: { order_id: orderId },
      })
      if (result.cancel_notes) {
        window.alert(
          `Refund issued (${result.refund_id}). Note: ${result.cancel_notes}`,
        )
      }
      await fetchOrders()
    } catch (requestError) {
      setSaveError(requestError.message)
    } finally {
      setSaving(null)
    }
  }

  async function handleCreateLabel(orderId) {
    if (!window.confirm(
      'Create a real SendCloud label for this order? This creates an actual shipment.',
    )) return
    setSaving(orderId)
    setSaveError('')
    setLastLabel(null)
    try {
      const result = await adminApi.request('create-sendcloud-parcel', {
        body: { order_id: orderId },
      })
      setLastLabel({
        orderId,
        trackingNumber: result.tracking_number,
      })
      await fetchOrders()
    } catch (requestError) {
      setSaveError(requestError.message)
    } finally {
      setSaving(null)
    }
  }

  async function handleViewLabel(orderId) {
    setSaveError('')
    try {
      const result = await adminApi.request('create-sendcloud-parcel', {
        body: { order_id: orderId, get_label: true },
      })
      downloadLabel(result.pdf_base64)
    } catch (requestError) {
      setSaveError(requestError.message)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div>
      <h1 className="page-title">Orders</h1>

      <BatchSummary batches={batches} />

      <div className="filters-bar" style={{ marginBottom: 24 }}>
        <div className="form-group">
          <label className="form-label">Search</label>
          <input
            className="input"
            placeholder="Name or email"
            value={search}
            onChange={event => {
              setSearch(event.target.value)
              setPage(0)
            }}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Type</label>
          <select
            className="select"
            value={typeFilter}
            onChange={event => {
              setTypeFilter(event.target.value)
              setPage(0)
            }}
          >
            <option value="">All Types</option>
            <option value="first_box">First Box</option>
            <option value="refill">Refill</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Dispatch Status</label>
          <select
            className="select"
            value={statusFilter}
            onChange={event => {
              setStatusFilter(event.target.value)
              setPage(0)
            }}
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="dispatched">Dispatched</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div style={{ alignItems: 'flex-end', display: 'flex' }}>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setSearch('')
              setTypeFilter('')
              setStatusFilter('')
              setPage(0)
            }}
          >
            Clear
          </button>
        </div>
        <div
          style={{
            alignItems: 'flex-end',
            color: 'var(--bone-muted)',
            display: 'flex',
            fontSize: 13,
            marginLeft: 'auto',
          }}
        >
          {total} orders
        </div>
      </div>

      {saveError && (
        <div className="error-state" style={{ marginBottom: 16 }}>
          {saveError}
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          Loading orders...
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
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Box</th>
                    <th>Dispatch By</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Carrier + Tracking</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="no-data">No orders found.</td>
                    </tr>
                  ) : orders.flatMap(order => {
                    const input = getInput(order.id)
                    const boxCode = getBoxCode(order)
                    const manifest = BOX_MANIFESTS[boxCode]
                    const dispatchDate = getDispatchDate(order.created_at)
                    const overdue = order.dispatch_status === 'pending'
                      && dispatchDate < today
                    const customerName = [
                      order.customer.first_name,
                      order.customer.last_name,
                    ].filter(Boolean).join(' ') || '—'

                    const rows = [
                      <tr
                        key={order.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setExpanded(current => ({
                          ...current,
                          [order.id]: !current[order.id],
                        }))}
                      >
                        <td
                          style={{
                            color: 'var(--bone-muted)',
                            fontSize: 13,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatDate(order.created_at)}
                        </td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{customerName}</div>
                          <div
                            style={{
                              color: 'var(--bone-muted)',
                              fontSize: 12,
                            }}
                          >
                            {order.customer.email}
                          </div>
                        </td>
                        <td>
                          <span
                            title={manifest
                              ? `${manifest.label} · ${
                                manifest.products.map(number =>
                                  PRODUCT_NAMES[number]).join(', ')
                              }`
                              : boxCode}
                            style={{
                              borderBottom:
                                '1px dashed rgba(74,143,199,0.4)',
                              color: 'var(--sky-blue)',
                              cursor: 'help',
                              fontFamily: 'monospace',
                              fontSize: 13,
                              fontWeight: 700,
                              letterSpacing: '0.05em',
                            }}
                          >
                            {boxCode}
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {order.dispatch_status === 'pending' ? (
                            <span
                              style={{
                                color: overdue
                                  ? 'var(--critical)'
                                  : 'var(--bone)',
                                fontSize: 13,
                                fontWeight: 500,
                              }}
                            >
                              {overdue && '⚠ '}
                              {formatDispatchDate(dispatchDate)}
                            </span>
                          ) : (
                            <span
                              style={{
                                color: 'var(--bone-muted)',
                                fontSize: 13,
                              }}
                            >
                              {formatDate(order.dispatched_at)}
                            </span>
                          )}
                        </td>
                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                          £{((order.amount_pence || 0) / 100).toFixed(2)}
                        </td>
                        <td>
                          <span
                            className={`risk-badge ${
                              order.status === 'cancelled'
                                ? 'critical'
                                : order.dispatch_status === 'pending'
                                  ? overdue ? 'critical' : 'low'
                                  : 'ok'
                            }`}
                          >
                            {order.status === 'cancelled'
                              ? 'cancelled'
                              : order.dispatch_status}
                          </span>
                        </td>
                        <td onClick={event => event.stopPropagation()}>
                          {order.dispatch_status === 'pending' ? (
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                              }}
                            >
                              <select
                                className="select"
                                style={{ fontSize: 12, padding: '5px 8px' }}
                                value={input.carrier}
                                onChange={event =>
                                  setInput(
                                    order.id,
                                    'carrier',
                                    event.target.value,
                                  )}
                              >
                                {CARRIERS.map(carrier => (
                                  <option
                                    key={carrier.value}
                                    value={carrier.value}
                                  >
                                    {carrier.label}
                                  </option>
                                ))}
                              </select>
                              <input
                                className="input"
                                style={{
                                  fontSize: 12,
                                  padding: '5px 8px',
                                  width: 140,
                                }}
                                placeholder="Tracking number..."
                                value={input.tracking}
                                onChange={event =>
                                  setInput(
                                    order.id,
                                    'tracking',
                                    event.target.value,
                                  )}
                              />
                            </div>
                          ) : order.tracking_number ? (
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 2,
                              }}
                            >
                              <span
                                style={{
                                  color: 'var(--bone-muted)',
                                  fontSize: 11,
                                  letterSpacing: '0.05em',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {getCarrier(order.carrier).label}
                              </span>
                              <TrackingLink
                                carrier={order.carrier}
                                tracking={order.tracking_number}
                              />
                            </div>
                          ) : (
                            <span
                              style={{
                                color: 'var(--bone-muted)',
                                fontSize: 12,
                              }}
                            >
                              No tracking
                            </span>
                          )}
                          {lastLabel?.orderId === order.id && (
                            <div
                              style={{
                                color: 'var(--sky-blue)',
                                fontSize: 11,
                                marginTop: 6,
                              }}
                            >
                              ✓ Label created — {lastLabel.trackingNumber}
                            </div>
                          )}
                          {order.sendcloud_parcel_id && (
                            <button
                              className="btn btn-sm btn-secondary"
                              style={{
                                fontSize: 11,
                                marginTop: 6,
                                padding: '3px 8px',
                              }}
                              onClick={() => handleViewLabel(order.id)}
                            >
                              View Label
                            </button>
                          )}
                        </td>
                        <td
                          style={{ whiteSpace: 'nowrap' }}
                          onClick={event => event.stopPropagation()}
                        >
                          <div
                            style={{
                              alignItems: 'center',
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: 6,
                            }}
                          >
                            {order.dispatch_status === 'pending' && (
                              <>
                                <button
                                  className="btn btn-sm btn-primary"
                                  onClick={() => handleCreateLabel(order.id)}
                                  disabled={saving === order.id}
                                >
                                  {saving === order.id
                                    ? '...'
                                    : 'Create Label'}
                                </button>
                                <button
                                  className="btn btn-sm btn-secondary"
                                  onClick={() => handleDispatch(order)}
                                  disabled={saving === order.id}
                                >
                                  {saving === order.id ? '...' : 'Dispatch'}
                                </button>
                              </>
                            )}
                            {order.dispatch_status === 'dispatched' && (
                              <>
                                <button
                                  className="btn btn-sm btn-secondary"
                                  onClick={() =>
                                    handleMarkDelivered(order.id)}
                                  disabled={saving === order.id}
                                >
                                  {saving === order.id ? '...' : 'Delivered'}
                                </button>
                                <button
                                  className="btn btn-sm btn-secondary"
                                  onClick={() =>
                                    handleResetToPending(order.id)}
                                  disabled={saving === order.id}
                                  title="Does not cancel an external shipment"
                                >
                                  {saving === order.id
                                    ? '...'
                                    : 'Reset to Pending'}
                                </button>
                              </>
                            )}
                            {order.dispatch_status === 'delivered' && (
                              <span
                                style={{
                                  color: 'var(--bone-muted)',
                                  fontSize: 12,
                                }}
                              >
                                {formatDate(order.dispatched_at)}
                              </span>
                            )}
                            {order.status !== 'cancelled' && (
                              <button
                                className="btn btn-sm"
                                style={{
                                  background: 'rgba(224,92,92,0.12)',
                                  border: '1px solid rgba(224,92,92,0.3)',
                                  color: '#e05c5c',
                                }}
                                onClick={() => handleCancel(order.id)}
                                disabled={saving === order.id}
                              >
                                Cancel & Refund
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>,
                    ]

                    if (expanded[order.id]) {
                      rows.push(
                        <tr
                          key={`${order.id}-detail`}
                          style={{ background: 'var(--surface-hover)' }}
                        >
                          <td
                            colSpan={8}
                            style={{
                              borderBottom: '1px solid var(--border)',
                              padding: '16px 20px',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 48,
                              }}
                            >
                              <div>
                                <div
                                  style={{
                                    color: 'var(--bone-muted)',
                                    fontSize: 11,
                                    letterSpacing: '0.15em',
                                    marginBottom: 8,
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  Ship To
                                </div>
                                <AddressBlock address={order.address} />
                              </div>
                              <div style={{ flex: 1 }}>
                                <div
                                  style={{
                                    color: 'var(--bone-muted)',
                                    fontSize: 11,
                                    letterSpacing: '0.15em',
                                    marginBottom: 8,
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  Box Contents ·{' '}
                                  <span style={{ color: 'var(--sky-blue)' }}>
                                    {boxCode}
                                  </span>
                                </div>
                                <div
                                  style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '6px 16px',
                                  }}
                                >
                                  {(manifest?.products ?? []).map(number => (
                                    <span
                                      key={number}
                                      style={{
                                        color: 'var(--bone-dim)',
                                        fontSize: 13,
                                      }}
                                    >
                                      <span
                                        style={{
                                          color: 'var(--sky-blue)',
                                          fontFamily: 'monospace',
                                          fontWeight: 600,
                                          marginRight: 5,
                                        }}
                                      >
                                        {number}
                                      </span>
                                      {PRODUCT_NAMES[number] ?? number}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <div
                                  style={{
                                    color: 'var(--bone-muted)',
                                    fontSize: 11,
                                    letterSpacing: '0.15em',
                                    marginBottom: 8,
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  Order ID
                                </div>
                                <span
                                  style={{
                                    color: 'var(--bone-muted)',
                                    fontFamily: 'monospace',
                                    fontSize: 12,
                                  }}
                                >
                                  {order.id.slice(0, 8)}
                                </span>
                                {order.status === 'cancelled' && (
                                  <div style={{ marginTop: 8 }}>
                                    <span
                                      style={{
                                        color: '#e05c5c',
                                        fontSize: 11,
                                        fontWeight: 600,
                                        letterSpacing: '0.1em',
                                        textTransform: 'uppercase',
                                      }}
                                    >
                                      Refunded
                                    </span>
                                    {order.refund_id && (
                                      <span
                                        style={{
                                          color: 'var(--bone-muted)',
                                          fontFamily: 'monospace',
                                          fontSize: 12,
                                          marginLeft: 8,
                                        }}
                                      >
                                        {order.refund_id}
                                      </span>
                                    )}
                                    {order.cancel_notes && (
                                      <div
                                        style={{
                                          color: '#e05c5c',
                                          fontSize: 12,
                                          lineHeight: 1.5,
                                          marginTop: 4,
                                        }}
                                      >
                                        ⚠ {order.cancel_notes}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>,
                      )
                    }
                    return rows
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <span className="pagination-info">
                Page {page + 1} of {totalPages} ({total} orders)
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
