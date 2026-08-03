import { useEffect, useMemo } from 'react'

const SCRIPT_ATTR = 'data-auditpilot-schema'

/**
 * Inject JSON-LD structured data into document head.
 */
export default function SeoStructuredData({ schemas = [] }) {
  const payloadKey = useMemo(() => JSON.stringify(schemas.filter(Boolean)), [schemas])

  useEffect(() => {
    const payload = JSON.parse(payloadKey)
    if (payload.length === 0) return undefined

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.setAttribute(SCRIPT_ATTR, 'true')
    script.textContent = JSON.stringify(payload.length === 1 ? payload[0] : payload)

    document.head.appendChild(script)

    return () => {
      script.remove()
    }
  }, [payloadKey])

  return null
}
