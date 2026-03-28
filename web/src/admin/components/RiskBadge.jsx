export default function RiskBadge({ level }) {
  const config = {
    ok: { label: 'OK', className: 'ok' },
    low: { label: 'LOW', className: 'low' },
    critical: { label: 'CRITICAL', className: 'critical' },
    out_of_stock: { label: 'OUT OF STOCK', className: 'out_of_stock' },
  }

  const { label, className } = config[level] || config.ok

  return (
    <span className={`risk-badge ${className}`}>
      {label}
    </span>
  )
}
