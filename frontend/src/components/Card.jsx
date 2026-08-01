export default function Card({ children, className = '', hover = false }) {
  return (
    <div
      className={[
        'rounded-xl border border-gray-200 bg-white p-6 shadow-sm',
        hover && 'transition-shadow duration-200 hover:shadow-md',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}
