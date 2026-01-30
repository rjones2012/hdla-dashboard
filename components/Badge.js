export function Badge({ children, variant = 'default' }) {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700',
    magenta: 'bg-hdla-magenta/10 text-hdla-magenta',
  };

  return (
    <span className={`
      inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
      ${variants[variant]}
    `}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const config = {
    healthy: { label: 'HEALTHY', variant: 'success' },
    watch: { label: 'WATCH', variant: 'warning' },
    hire: { label: 'HIRE NOW', variant: 'danger' },
  };

  const { label, variant } = config[status] || config.healthy;
  return <Badge variant={variant}>{label}</Badge>;
}

export function ProbabilityBadge({ probability }) {
  const config = {
    H: { label: 'High', variant: 'success' },
    M: { label: 'Medium', variant: 'warning' },
    L: { label: 'Low', variant: 'danger' },
    XL: { label: 'X-Low', variant: 'default' },
  };

  const { label, variant } = config[probability] || config.XL;
  return <Badge variant={variant}>{label}</Badge>;
}
