export default function SectionHeader({
  kicker,
  title,
  description,
  align = 'center',
  className = '',
}) {
  const alignClass = align === 'left' ? 'text-left' : 'text-center mx-auto'

  return (
    <div className={[align === 'center' ? 'max-w-2xl mx-auto' : '', alignClass, className].filter(Boolean).join(' ')}>
      {kicker && (
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">{kicker}</p>
      )}
      {title && (
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{title}</h2>
      )}
      {description && (
        <p className="mt-3 text-base leading-relaxed text-gray-600">{description}</p>
      )}
    </div>
  )
}
