const variants = {
  default: 'border-gray-200 bg-white shadow-sm',
  elevated: 'border-gray-100 bg-white shadow-md',
  muted: 'border-gray-200 bg-gray-50/80 shadow-sm',
  accent: 'border-brand-100 bg-gradient-to-br from-brand-50/60 via-white to-emerald-50/40 shadow-sm',
  flat: 'border-gray-200 bg-white shadow-none',
}

const paddings = {
  md: 'p-6',
  lg: 'p-8',
  none: 'p-0',
}

export default function Card({
  children,
  className = '',
  hover = false,
  variant = 'default',
  padding = 'md',
}) {
  return (
    <div
      className={[
        'rounded-2xl border',
        variants[variant] || variants.default,
        paddings[padding] || paddings.md,
        hover && 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}
