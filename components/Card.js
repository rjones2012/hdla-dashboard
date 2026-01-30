export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-hdla shadow-sm border border-gray-100 p-5 ${className}`}>
      {children}
    </div>
  );
}

export function MetricCard({ label, value, subvalue, trend, className = '' }) {
  return (
    <Card className={`py-3 ${className}`}>
      <div className="text-xs text-hdla-muted uppercase tracking-wide">{label}</div>
      <div className="text-4xl font-bold text-hdla-text leading-tight">{value}</div>
      {subvalue && (
        <div className="text-sm text-hdla-muted">{subvalue}</div>
      )}
      {trend && (
        <div className={`text-sm ${trend > 0 ? 'text-status-healthy' : 'text-status-hire'}`}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </div>
      )}
    </Card>
  );
}

export function StatusCard({ label, value, status, description }) {
  const statusColors = {
    healthy: 'border-l-status-healthy',
    watch: 'border-l-status-watch',
    hire: 'border-l-status-hire',
  };

  const statusBg = {
    healthy: 'bg-green-50',
    watch: 'bg-yellow-50',
    hire: 'bg-red-50',
  };

  return (
    <Card className={`border-l-4 ${statusColors[status]} ${statusBg[status]}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-hdla-muted mb-1">
        {label}
      </div>
      <div className="text-3xl font-bold text-hdla-text">{value}</div>
      {description && (
        <div className="text-sm text-hdla-muted mt-2">{description}</div>
      )}
    </Card>
  );
}
