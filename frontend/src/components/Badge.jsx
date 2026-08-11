const variants = {
  default: 'border-gray-200 bg-gray-50 text-gray-700',
  brand: 'border-brand-200 bg-brand-50 text-brand-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  danger: 'border-red-200 bg-red-50 text-red-800',
  muted: 'border-gray-200 bg-white text-gray-600',
}

const sizes = {
  sm: 'px-2 py-0.5 text-[10px] uppercase tracking-wide',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-3 py-1 text-xs',
}

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  dot = false,
}) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border font-semibold',
        variants[variant],
        sizes[size],
        className,
      ].join(' ')}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  )
}
