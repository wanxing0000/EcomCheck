/**
 * Fix Assistant — generates copy-ready policy drafts from audit findings.
 * Presentation layer only; does not modify rule pass/fail outcomes.
 */

const SUPPORTED_RULE_IDS = new Set(['G005', 'G008', 'G010', 'G011', 'G012', 'M001', 'M002', 'M003', 'M004', 'M005', 'T001', 'P001', 'P002', 'P003'])

const RULE_TITLES = {
  G005: 'Product Identifiers',
  G008: 'Payment Information',
  G010: 'Shipping Policy',
  G011: 'Product Schema Completeness',
  G012: 'Product Identifier Quality',
  M001: 'Business Identity',
  M002: 'Policy Quality',
  M003: 'Product Trust Signals',
  M004: 'Product Content Quality',
  M005: 'Product Trust Signals',
  T001: 'Contact Information',
  P001: 'Privacy Policy',
  P002: 'Refund Policy',
  P003: 'Shipping Information',
}

function normalizeList(values) {
  return (values || []).map((value) => String(value).toLowerCase())
}

function missingIncludes(missing, ...patterns) {
  const normalized = normalizeList(missing)
  return patterns.some((pattern) =>
    normalized.some((item) => item.includes(pattern.toLowerCase()))
  )
}

function extractDetectedValue(detected, label) {
  const prefix = `${label}:`
  for (const item of detected || []) {
    if (typeof item !== 'string') continue
    if (item.toLowerCase().startsWith(prefix.toLowerCase())) {
      return item.slice(prefix.length).trim()
    }
  }
  return null
}

function joinSections(sections) {
  return sections
    .map((section) => {
      const heading = section.heading ? `## ${section.heading}\n\n` : ''
      return `${heading}${section.body}`.trim()
    })
    .join('\n\n')
}

function buildOutput({ ruleId, explanation, sections, copyReadyText, title = null }) {
  return {
    title: title || `${RULE_TITLES[ruleId]} — Fix Draft`,
    explanation,
    generatedContent: joinSections(sections),
    sections,
    copyReadyText,
  }
}

function missingMatches(missing, ...patterns) {
  const normalized = normalizeList(missing)
  return normalized.some((item) =>
    patterns.some((pattern) => item.includes(pattern.toLowerCase()))
  )
}

function detectedIncludes(detected, ...patterns) {
  const normalized = normalizeList(detected)
  return patterns.some((pattern) =>
    normalized.some((item) => item.includes(pattern.toLowerCase()))
  )
}

function hasDetectedSignal(detected, patterns) {
  return detectedIncludes(detected, ...patterns)
}

function generateContactAssistant({ ruleId, evidence, missing, detected }) {
  if (
    missing.length === 0 &&
    (hasDetectedSignal(detected, 'email') ||
      hasDetectedSignal(detected, 'phone') ||
      hasDetectedSignal(detected, 'address'))
  ) {
    return null
  }

  const fields = [
    {
      missingPatterns: ['company', 'company name'],
      detectedPatterns: ['company'],
      line: 'Company: {{COMPANY_NAME}}',
      placeholder: '{{COMPANY_NAME}}',
    },
    {
      missingPatterns: ['email', 'contact email', 'domain email'],
      detectedPatterns: ['email'],
      line: 'Email: {{CONTACT_EMAIL}}',
      placeholder: '{{CONTACT_EMAIL}}',
    },
    {
      missingPatterns: ['phone'],
      detectedPatterns: ['phone'],
      line: 'Phone: {{PHONE}}',
      placeholder: '{{PHONE}}',
    },
    {
      missingPatterns: ['address', 'business address', 'physical address'],
      detectedPatterns: ['address'],
      line: 'Address: {{BUSINESS_ADDRESS}}',
      placeholder: '{{BUSINESS_ADDRESS}}',
    },
  ]

  const lines = []
  const placeholders = []
  const promptAll = missing.length === 0 && detected.length === 0

  for (const field of fields) {
    const isMissing = missingIncludes(missing, ...field.missingPatterns)
    const isDetected = hasDetectedSignal(detected, field.detectedPatterns)

    if (isDetected && !isMissing) continue
    if (isMissing || promptAll) {
      lines.push(field.line)
      placeholders.push(field.placeholder)
    }
  }

  if (lines.length === 0) return null

  if (lines.length === 0) return null

  const sections = [
    {
      heading: 'Contact Information',
      body: [
        'Add the following contact details to your footer, Contact page, or About page:',
        '',
        ...lines,
      ].join('\n'),
      placeholders,
      instruction: 'Replace every placeholder with your verified business information. Do not publish fake company details.',
    },
  ]

  return buildOutput({
    ruleId,
    explanation:
      'Use this contact information template where shoppers and review teams can reach your business. Only add details you can verify.',
    sections,
    copyReadyText: joinSections(sections),
  })
}

function generateP002Assistant({ evidence, missing, detected }) {
  if (detectedIncludes(detected, 'refund policy page found', 'refund page found') && missing.length === 0) {
    return null
  }

  const pageMissing =
    missingIncludes(missing, 'refund policy page') ||
    /no refund|no return policy/i.test(evidence?.message || '')

  const sections = []
  const lines = []
  const placeholders = []

  const refundFields = [
    {
      missingPatterns: ['return period', 'return window', 'refund policy page'],
      line: 'Return period: {{RETURN_PERIOD}}',
      placeholder: '{{RETURN_PERIOD}}',
    },
    {
      missingPatterns: ['refund method', 'refund policy page'],
      line: 'Refund method: {{REFUND_METHOD}}',
      placeholder: '{{REFUND_METHOD}}',
    },
    {
      missingPatterns: ['return conditions', 'refund policy page'],
      line: 'Return conditions: {{RETURN_CONDITIONS}}',
      placeholder: '{{RETURN_CONDITIONS}}',
    },
    {
      missingPatterns: ['return address', 'refund policy page'],
      line: 'Return address: {{RETURN_ADDRESS}}',
      placeholder: '{{RETURN_ADDRESS}}',
    },
  ]

  for (const field of refundFields) {
    if (pageMissing || missingIncludes(missing, ...field.missingPatterns)) {
      if (!lines.includes(field.line)) {
        lines.push(field.line)
        placeholders.push(field.placeholder)
      }
    }
  }

  if (lines.length === 0) return null

  sections.push({
    heading: pageMissing ? 'Refund / Return Policy' : 'Refund Policy — Suggested Additions',
    body: pageMissing
      ? [
          'Create a refund or return policy page that includes:',
          '',
          ...lines,
          '',
          'Do not promise refund terms or legal guarantees you cannot honor.',
        ].join('\n')
      : lines.join('\n'),
    placeholders,
    instruction: 'Replace placeholders with your actual return policy details before publishing.',
  })

  return buildOutput({
    ruleId: 'P002',
    explanation:
      'Use this draft to document how customers can return items and receive refunds. Consult legal counsel for jurisdiction-specific requirements.',
    sections,
    copyReadyText: joinSections(sections),
  })
}

function generateP003Assistant({ evidence, missing, detected }) {
  if (detectedIncludes(detected, 'shipping policy page found', 'shipping page found') && missing.length === 0) {
    return null
  }

  const pageMissing =
    missingIncludes(missing, 'shipping policy page') ||
    /no shipping policy page/i.test(evidence?.message || '')

  const sections = []
  const lines = []
  const placeholders = []

  const shippingFields = [
    {
      missingPatterns: ['processing time', 'shipping policy page'],
      line: 'Processing time: {{PROCESSING_TIME}}',
      placeholder: '{{PROCESSING_TIME}}',
    },
    {
      missingPatterns: ['shipping region', 'regions', 'shipping policy page'],
      line: 'Shipping regions: {{SHIPPING_REGIONS}}',
      placeholder: '{{SHIPPING_REGIONS}}',
    },
    {
      missingPatterns: ['delivery time', 'delivery timeframes', 'shipping policy page'],
      line: 'Delivery time: {{DELIVERY_TIME}}',
      placeholder: '{{DELIVERY_TIME}}',
    },
    {
      missingPatterns: ['shipping cost', 'shipping costs', 'shipping policy page'],
      line: 'Shipping cost: {{SHIPPING_COST}}',
      placeholder: '{{SHIPPING_COST}}',
    },
  ]

  for (const field of shippingFields) {
    if (pageMissing || missingIncludes(missing, ...field.missingPatterns)) {
      if (!lines.includes(field.line)) {
        lines.push(field.line)
        placeholders.push(field.placeholder)
      }
    }
  }

  if (lines.length === 0) return null

  sections.push({
    heading: pageMissing ? 'Shipping Information' : 'Shipping Information — Suggested Additions',
    body: pageMissing
      ? [
          'Create a shipping policy page that includes:',
          '',
          ...lines,
        ].join('\n')
      : lines.join('\n'),
    placeholders,
    instruction: 'Replace placeholders with your actual processing times, regions, delivery windows, and shipping fees.',
  })

  return buildOutput({
    ruleId: 'P003',
    explanation:
      'Use this shipping information template so customers understand delivery expectations before purchase.',
    sections,
    copyReadyText: joinSections(sections),
  })
}

function generateP001Assistant({ evidence, missing, detected }) {
  if (detectedIncludes(detected, 'privacy policy page found', 'privacy page found') && missing.length === 0) {
    return null
  }

  const sections = [
    {
      heading: 'Privacy Policy Guidance Checklist',
      body: [
        'This is guidance only — not a complete legal privacy policy. Work with qualified counsel for your jurisdiction.',
        '',
        'Required sections to address:',
        '',
        '- Data collection: describe what personal data you collect (name, email, order details, etc.)',
        '- Cookies: explain whether you use cookies or similar tracking technologies',
        '- Payment information: describe how payment data is collected, processed, and stored',
        '- Third-party services: list relevant providers (payment processors, analytics, email tools, ad platforms)',
        '',
        'Publish the finished policy on a dedicated page and link it in your website footer.',
      ].join('\n'),
      placeholders: [],
      instruction: 'Use this checklist while drafting your privacy policy. Do not copy generic legal text without review.',
    },
  ]

  return buildOutput({
    ruleId: 'P001',
    title: 'Privacy Policy Guidance',
    explanation:
      'Your scan did not find a privacy policy page. Use this checklist to plan the sections your policy should cover.',
    sections,
    copyReadyText: joinSections(sections),
  })
}

function categorizeM003Missing(missing = []) {
  return {
    description: missingMatches(missing, 'description'),
    specifications: missingMatches(missing, 'specification', 'attributes', 'attribute'),
    material: missingMatches(missing, 'material'),
    size: missingMatches(missing, 'size', 'dimension'),
    brand: missingMatches(missing, 'brand'),
    sku: missingMatches(missing, 'sku'),
    warranty: missingMatches(missing, 'warranty', 'guarantee'),
    images: missingMatches(missing, 'alt text', 'image'),
    reviews: missingMatches(missing, 'review', 'rating'),
    other: (missing || []).filter((item) => {
      const lower = String(item).toLowerCase()
      return ![
        'description',
        'specification',
        'attributes',
        'attribute',
        'material',
        'size',
        'dimension',
        'brand',
        'sku',
        'warranty',
        'guarantee',
        'alt text',
        'image',
        'review',
        'rating',
      ].some((token) => lower.includes(token))
    }),
  }
}

function generateM003Assistant({ evidence, missing, detected }) {
  const gaps = categorizeM003Missing(missing)
  const sections = []
  const descriptionLines = []
  const specificationLines = []
  const trustSuggestions = []

  if (gaps.description) {
    descriptionLines.push(
      '{{PRODUCT_NAME}} — add an accurate product title customers will recognize.',
      '',
      'Describe what the product is, who it is for, and the primary benefits using factual language.',
      'Include measurable details where available (dimensions, capacity, compatibility).',
      'Avoid exaggerated marketing claims or unverifiable superlatives.'
    )
    sections.push({
      heading: 'Product Description Template',
      body: descriptionLines.join('\n'),
      placeholders: ['{{PRODUCT_NAME}}'],
      instruction: 'Replace {{PRODUCT_NAME}} with the actual product name from your catalog.',
    })
  }

  if (gaps.specifications || gaps.material || gaps.size || gaps.brand || gaps.sku) {
    if (gaps.brand) specificationLines.push('Brand: {{BRAND}}')
    if (gaps.sku) specificationLines.push('SKU: {{SKU}}')
    if (gaps.material) specificationLines.push('Material: {{MATERIAL}}')
    if (gaps.size) specificationLines.push('Size: {{SIZE}}')
    if (gaps.specifications) {
      specificationLines.push('Key specifications: {{SPECIFICATIONS}}')
    }

    sections.push({
      heading: 'Specification Section Template',
      body: specificationLines.join('\n'),
      placeholders: [
        gaps.brand ? '{{BRAND}}' : null,
        gaps.sku ? '{{SKU}}' : null,
        gaps.material ? '{{MATERIAL}}' : null,
        gaps.size ? '{{SIZE}}' : null,
        gaps.specifications ? '{{SPECIFICATIONS}}' : null,
      ].filter(Boolean),
      instruction: 'Fill in only accurate product attributes. Do not invent brand names or specifications.',
    })
  }

  if (gaps.warranty) {
    sections.push({
      heading: 'Warranty Information',
      body: 'Warranty coverage: {{WARRANTY_TERMS}}',
      placeholders: ['{{WARRANTY_TERMS}}'],
      instruction:
        'Replace {{WARRANTY_TERMS}} with your real warranty or guarantee terms. Do not publish warranty periods you do not offer.',
    })
  }

  if (gaps.images) {
    trustSuggestions.push(
      'Add descriptive alt text to each product image (material, color, variant, or use case).'
    )
  }

  if (gaps.reviews) {
    trustSuggestions.push(
      'Display genuine customer reviews or ratings if you collect them. Do not fabricate review counts or scores.'
    )
  }

  if (gaps.other.length > 0) {
    trustSuggestions.push(
      ...gaps.other.map((item) => `Address missing trust signal: ${item}`)
    )
  }

  if (trustSuggestions.length > 0) {
    sections.push({
      heading: 'Trust Signal Suggestions',
      body: trustSuggestions.map((item) => `- ${item}`).join('\n'),
      placeholders: [],
    })
  }

  if (sections.length === 0) {
    sections.push({
      heading: 'Product Page Improvements',
      body: [
        'Review your product detail page and add factual information shoppers need to make a confident purchase.',
        '',
        'Common trust signals to verify:',
        '- Accurate product description',
        '- Specifications (material, size, compatibility)',
        '- Clear brand attribution: {{BRAND}}',
        '- Warranty or guarantee terms you actually offer: {{WARRANTY_TERMS}}',
      ].join('\n'),
      placeholders: ['{{BRAND}}', '{{WARRANTY_TERMS}}'],
    })
  }

  const copyReadyText = joinSections(sections)
  const explanation =
    detected?.length > 0
      ? 'Your scan found some product trust signals, but key details are still missing. Add the sections below using only accurate product information.'
      : 'Use these templates to strengthen product pages. Replace every placeholder with verified product details — never publish fabricated brands, certifications, or warranty terms.'

  return buildOutput({
    ruleId: 'M003',
    explanation,
    sections,
    copyReadyText,
  })
}

const G005_IDENTIFIERS = [
  { key: 'brand', label: 'Brand', placeholder: '{{BRAND}}' },
  { key: 'sku', label: 'SKU', placeholder: '{{SKU}}' },
  { key: 'gtin', label: 'GTIN', placeholder: '{{GTIN}}' },
  { key: 'mpn', label: 'MPN', placeholder: '{{MPN}}' },
]

function parseG005DetectedIdentifiers(detected = [], evidence = {}) {
  const known = new Map()

  for (const item of detected) {
    const lower = String(item).toLowerCase()
    for (const identifier of G005_IDENTIFIERS) {
      if (lower === identifier.key || lower === identifier.label.toLowerCase()) {
        known.set(identifier.key, true)
      }
    }
  }

  const presentMatch = evidence?.message?.match(/present:\s*([^.]+)/i)
  if (presentMatch) {
    for (const part of presentMatch[1].split(',')) {
      const key = part.trim().toLowerCase()
      if (G005_IDENTIFIERS.some((identifier) => identifier.key === key)) {
        known.set(key, true)
      }
    }
  }

  return known
}

function generateG005Assistant({ evidence, missing, detected }) {
  const known = parseG005DetectedIdentifiers(detected, evidence)
  const lines = []
  const placeholders = []

  for (const identifier of G005_IDENTIFIERS) {
    const isMissing =
      missingIncludes(missing, identifier.key) || missingIncludes(missing, identifier.label)

    if (isMissing) {
      lines.push(`${identifier.label}: ${identifier.placeholder}`)
      placeholders.push(identifier.placeholder)
    }
  }

  if (lines.length === 0) {
    const missingMatch = evidence?.message?.match(/missing:\s*([^.]+)/i)
    if (missingMatch) {
      for (const part of missingMatch[1].split(',')) {
        const key = part.trim().toLowerCase()
        const identifier = G005_IDENTIFIERS.find((entry) => entry.key === key)
        if (identifier && !known.has(identifier.key)) {
          lines.push(`${identifier.label}: ${identifier.placeholder}`)
          placeholders.push(identifier.placeholder)
        }
      }
    }
  }

  if (lines.length === 0) {
    for (const identifier of G005_IDENTIFIERS) {
      if (!known.has(identifier.key)) {
        lines.push(`${identifier.label}: ${identifier.placeholder}`)
        placeholders.push(identifier.placeholder)
      }
    }
  }

  const jsonLdFields = []
  if (missingIncludes(missing, 'brand') || placeholders.includes('{{BRAND}}')) {
    jsonLdFields.push('  "brand": { "@type": "Brand", "name": "{{BRAND}}" },')
  }
  if (missingIncludes(missing, 'sku') || placeholders.includes('{{SKU}}')) {
    jsonLdFields.push('  "sku": "{{SKU}}",')
  }
  if (missingIncludes(missing, 'gtin') || placeholders.includes('{{GTIN}}')) {
    jsonLdFields.push('  "gtin": "{{GTIN}}",')
  }
  if (missingIncludes(missing, 'mpn') || placeholders.includes('{{MPN}}')) {
    jsonLdFields.push('  "mpn": "{{MPN}}",')
  }

  const jsonLdBlock = [
    '<script type="application/ld+json">',
    '{',
    '  "@context": "https://schema.org/",',
    '  "@type": "Product",',
    '  "name": "{{PRODUCT_NAME}}",',
    ...jsonLdFields,
    '  "offers": {',
    '    "@type": "Offer",',
    '    "price": "{{PRICE}}",',
    '    "priceCurrency": "{{CURRENCY}}",',
    '    "availability": "https://schema.org/InStock"',
    '  }',
    '}',
    '</script>',
  ].join('\n')

  const sections = [
    {
      heading: 'Structured Data Fix Draft',
      body: lines.join('\n'),
      placeholders,
      instruction: 'Add only identifiers that match your product catalog. Do not invent GTIN, MPN, or brand values.',
    },
    {
      heading: 'Product JSON-LD Template',
      body: jsonLdBlock,
      placeholders: ['{{PRODUCT_NAME}}', ...placeholders, '{{PRICE}}', '{{CURRENCY}}'],
      instruction: 'Paste into your product page HTML and replace placeholders with verified catalog data.',
    },
  ]

  const copyReadyText = joinSections(sections)
  const explanation =
    'Use this structured data draft to add missing product identifiers in Product JSON-LD. Only publish values that exist in your product feed or catalog.'

  return buildOutput({
    ruleId: 'G005',
    title: 'Structured Data Fix Draft',
    explanation,
    sections,
    copyReadyText,
  })
}

function paymentMethodsBlock(detected) {
  const knownMethods = extractDetectedValue(detected, 'Payment methods')
  if (knownMethods) {
    return {
      heading: 'Accepted Payment Methods',
      body: `We accept the following payment methods: ${knownMethods}.`,
      placeholders: [],
    }
  }

  return {
    heading: 'Accepted Payment Methods',
    body: 'Add your accepted payment methods here: {{PAYMENT_METHODS}}',
    placeholders: ['{{PAYMENT_METHODS}}'],
    instruction: 'Replace {{PAYMENT_METHODS}} with the payment options you actually offer (e.g. Visa, Mastercard, PayPal).',
  }
}

function generateG008Assistant({ evidence, missing, detected }) {
  const sections = []
  const pageMissing =
    missingIncludes(missing, 'payment page') ||
    /no payment policy page/i.test(evidence?.message || '')

  if (pageMissing) {
    sections.push({
      heading: 'Payment Information',
      body: [
        'This page explains how customers can pay for orders on your store.',
        '',
        '## Accepted Payment Methods',
        '',
        'Add your accepted payment methods here: {{PAYMENT_METHODS}}',
        '',
        '## Billing & Pricing',
        '',
        'All prices are displayed in {{CURRENCY}}. Payment is collected at checkout. {{BILLING_TERMS}}',
        '',
        '## Payment Security',
        '',
        'Describe how you protect customer payment information (e.g. SSL encryption, PCI-compliant processor).',
      ].join('\n'),
      placeholders: ['{{PAYMENT_METHODS}}', '{{CURRENCY}}', '{{BILLING_TERMS}}'],
    })
  } else {
    if (missingIncludes(missing, 'payment method')) {
      sections.push(paymentMethodsBlock(detected))
    }

    if (missingIncludes(missing, 'billing')) {
      sections.push({
        heading: 'Billing & Pricing',
        body: 'All prices are displayed in {{CURRENCY}}. Payment is collected at checkout. {{BILLING_TERMS}}',
        placeholders: ['{{CURRENCY}}', '{{BILLING_TERMS}}'],
        instruction: 'Replace placeholders with your actual currency and billing terms.',
      })
    }

    if (missingIncludes(missing, 'sufficient content', 'content length', 'too short')) {
      sections.push({
        heading: 'Additional Payment Details',
        body: 'Provide clear details about when charges occur, refunds for failed payments, and how customers can get billing support.',
        placeholders: [],
      })
    }

    if (sections.length === 0) {
      sections.push(paymentMethodsBlock(detected))
      sections.push({
        heading: 'Billing & Pricing',
        body: 'All prices are displayed in {{CURRENCY}}. Payment is collected at checkout.',
        placeholders: ['{{CURRENCY}}'],
      })
    }
  }

  const copyReadyText = joinSections(sections)
  const explanation =
    'Copy this draft into your payment policy page. Replace every {{PLACEHOLDER}} with your real store details — do not publish example payment methods you do not offer.'

  return buildOutput({
    ruleId: 'G008',
    explanation,
    sections,
    copyReadyText,
  })
}

function generateG010Assistant({ evidence, missing, detected }) {
  const sections = []
  const pageMissing =
    missingIncludes(missing, 'shipping policy page') ||
    /no shipping policy page/i.test(evidence?.message || '')

  const knownCost = extractDetectedValue(detected, 'Shipping cost')

  if (pageMissing) {
    sections.push({
      heading: 'Shipping Policy',
      body: [
        'This page explains how orders are shipped, how much shipping costs, and when customers can expect delivery.',
        '',
        '## Delivery Timeframes',
        '',
        'Orders are typically delivered within {{DELIVERY_TIME}}.',
        '',
        '## Shipping Costs',
        '',
        knownCost
          ? `Shipping costs: ${knownCost}.`
          : 'Describe your shipping fees here: {{SHIPPING_COST}}',
        '',
        '## Regions We Ship To',
        '',
        'List the countries or regions you ship to: {{SHIPPING_REGIONS}}',
        '',
        '## Order Processing',
        '',
        'Orders are processed within {{PROCESSING_TIME}} business days before shipment.',
      ].join('\n'),
      placeholders: knownCost
        ? ['{{DELIVERY_TIME}}', '{{SHIPPING_REGIONS}}', '{{PROCESSING_TIME}}']
        : ['{{DELIVERY_TIME}}', '{{SHIPPING_COST}}', '{{SHIPPING_REGIONS}}', '{{PROCESSING_TIME}}'],
    })
  } else {
    if (missingIncludes(missing, 'delivery time')) {
      sections.push({
        heading: 'Delivery Timeframes',
        body: 'Orders are typically delivered within {{DELIVERY_TIME}}. Processing times may vary during peak seasons.',
        placeholders: ['{{DELIVERY_TIME}}'],
        instruction: 'Replace {{DELIVERY_TIME}} with your actual delivery window (e.g. 5–7 business days).',
      })
    }

    if (missingIncludes(missing, 'shipping cost', 'shipping costs')) {
      sections.push({
        heading: 'Shipping Costs',
        body: knownCost
          ? `Shipping costs: ${knownCost}.`
          : 'Describe your shipping fees here: {{SHIPPING_COST}}',
        placeholders: knownCost ? [] : ['{{SHIPPING_COST}}'],
        instruction: knownCost
          ? undefined
          : 'Replace {{SHIPPING_COST}} with your flat rate, free-shipping threshold, or calculated-at-checkout note.',
      })
    }

    if (missingIncludes(missing, 'shipping region', 'regions')) {
      sections.push({
        heading: 'Regions We Ship To',
        body: 'We currently ship to: {{SHIPPING_REGIONS}}',
        placeholders: ['{{SHIPPING_REGIONS}}'],
      })
    }

    if (sections.length === 0) {
      sections.push({
        heading: 'Shipping Policy',
        body: [
          '## Delivery Timeframes',
          '',
          'Orders are typically delivered within {{DELIVERY_TIME}}.',
          '',
          '## Shipping Costs',
          '',
          'Describe your shipping fees here: {{SHIPPING_COST}}',
        ].join('\n'),
        placeholders: ['{{DELIVERY_TIME}}', '{{SHIPPING_COST}}'],
      })
    }
  }

  const copyReadyText = joinSections(sections)
  const explanation =
    'Copy this draft into your shipping policy page. Replace placeholders with your actual delivery times, shipping fees, and service regions.'

  return buildOutput({
    ruleId: 'G010',
    explanation,
    sections,
    copyReadyText,
  })
}

function parseM002MissingItem(item) {
  const match = String(item).match(/^([^:]+):\s*(.+)$/i)
  if (match) {
    return { policy: match[1].trim().toLowerCase(), gap: match[2].trim() }
  }

  const lower = String(item).toLowerCase()
  if (lower.includes('refund') || lower.includes('return')) return { policy: 'refund', gap: item }
  if (lower.includes('shipping') || lower.includes('delivery')) return { policy: 'shipping', gap: item }
  if (lower.includes('payment')) return { policy: 'payment', gap: item }
  return { policy: 'general', gap: item }
}

function m002SectionForPolicy(policy, gaps) {
  const gapText = normalizeList(gaps)

  if (policy === 'refund') {
    return {
      heading: 'Refund Policy — Suggested Additions',
      body: [
        '## Return Window',
        '',
        'Customers may return eligible items within {{RETURN_WINDOW}} of delivery.',
        '',
        '## Return Conditions',
        '',
        '{{RETURN_CONDITIONS}}',
        '',
        '## How to Request a Refund',
        '',
        'Contact us at {{SUPPORT_EMAIL}} with your order number to start a return.',
      ].join('\n'),
      placeholders: ['{{RETURN_WINDOW}}', '{{RETURN_CONDITIONS}}', '{{SUPPORT_EMAIL}}'],
      gaps,
    }
  }

  if (policy === 'shipping') {
    return {
      heading: 'Shipping Policy — Suggested Additions',
      body: [
        '## Delivery Timeframes',
        '',
        'Orders are typically delivered within {{DELIVERY_TIME}}.',
        '',
        '## Shipping Costs',
        '',
        '{{SHIPPING_COST}}',
      ].join('\n'),
      placeholders: ['{{DELIVERY_TIME}}', '{{SHIPPING_COST}}'],
      gaps,
    }
  }

  if (policy === 'payment') {
    return {
      heading: 'Payment Policy — Suggested Additions',
      body: [
        '## Accepted Payment Methods',
        '',
        'Add your accepted payment methods here: {{PAYMENT_METHODS}}',
        '',
        '## Billing Terms',
        '',
        'All prices are displayed in {{CURRENCY}}. {{BILLING_TERMS}}',
      ].join('\n'),
      placeholders: ['{{PAYMENT_METHODS}}', '{{CURRENCY}}', '{{BILLING_TERMS}}'],
      gaps,
    }
  }

  return {
    heading: 'Policy Improvements',
    body: gaps.map((gap) => `- Address: ${gap}`).join('\n'),
    placeholders: [],
    gaps,
  }
}

function generateM002Assistant({ evidence, missing, detected }) {
  const sections = []
  const grouped = new Map()

  for (const item of missing || []) {
    const { policy, gap } = parseM002MissingItem(item)
    if (!grouped.has(policy)) grouped.set(policy, [])
    grouped.get(policy).push(gap)
  }

  const report = evidence?.policyQualityReport
  if (report?.policies?.length) {
    for (const policy of report.policies) {
      if (policy.found === false) {
        const key = policy.label?.toLowerCase() || 'general'
        if (!grouped.has(key)) grouped.set(key, [])
        grouped.get(key).push(`${policy.label} page`)
      }
      for (const gap of policy.missing || []) {
        const key = policy.label?.toLowerCase() || 'general'
        if (!grouped.has(key)) grouped.set(key, [])
        grouped.get(key).push(`${policy.label}: ${gap}`)
      }
    }
  }

  if (grouped.size === 0) {
    sections.push({
      heading: 'Store Policies — Suggested Improvements',
      body: [
        'Expand your refund, shipping, and payment policies with:',
        '',
        '- Return window and refund conditions: {{RETURN_WINDOW}}',
        '- Delivery timeframes: {{DELIVERY_TIME}}',
        '- Shipping costs: {{SHIPPING_COST}}',
        '- Accepted payment methods: {{PAYMENT_METHODS}}',
      ].join('\n'),
      placeholders: ['{{RETURN_WINDOW}}', '{{DELIVERY_TIME}}', '{{SHIPPING_COST}}', '{{PAYMENT_METHODS}}'],
    })
  } else {
    for (const [policy, gaps] of grouped.entries()) {
      sections.push(m002SectionForPolicy(policy, gaps))
    }
  }

  const copyReadyText = joinSections(sections)
  const explanation =
    detected?.length > 0
      ? 'Your scan found some policy content, but key details are still missing. Use this draft to fill the gaps — replace every placeholder with accurate store information.'
      : 'Use this draft to strengthen your store policies. Replace every placeholder with accurate information before publishing.'

  return buildOutput({
    ruleId: 'M002',
    explanation,
    sections,
    copyReadyText,
  })
}

const G011_SCHEMA_FIELDS = [
  {
    key: 'name',
    detect: ['name', 'product name'],
    json: '  "name": "{{PRODUCT_NAME}}",',
    placeholder: '{{PRODUCT_NAME}}',
  },
  {
    key: 'image',
    detect: ['image'],
    json: '  "image": ["{{PRODUCT_IMAGE}}"],',
    placeholder: '{{PRODUCT_IMAGE}}',
  },
  {
    key: 'description',
    detect: ['description'],
    json: '  "description": "{{PRODUCT_DESCRIPTION}}",',
    placeholder: '{{PRODUCT_DESCRIPTION}}',
  },
  {
    key: 'sku',
    detect: ['sku'],
    json: '  "sku": "{{SKU}}",',
    placeholder: '{{SKU}}',
  },
  {
    key: 'brand',
    detect: ['brand'],
    json: '  "brand": { "@type": "Brand", "name": "{{BRAND}}" },',
    placeholder: '{{BRAND}}',
  },
]

function isG011FieldMissing(missing, key) {
  return missingIncludes(missing, key)
}

function isG011FieldDetected(detected, patterns) {
  return hasDetectedSignal(detected, patterns)
}

function generateG011Assistant({ evidence, missing, detected }) {
  const jsonFields = []
  const placeholders = []

  for (const field of G011_SCHEMA_FIELDS) {
    if (!isG011FieldMissing(missing, field.key)) continue
    if (isG011FieldDetected(detected, field.detect)) continue
    jsonFields.push(field.json)
    placeholders.push(field.placeholder)
  }

  const needsOffers =
    isG011FieldMissing(missing, 'offers') ||
    isG011FieldMissing(missing, 'price') ||
    isG011FieldMissing(missing, 'availability')

  const hasOfferSignals =
    isG011FieldDetected(detected, 'price', 'availability', 'offers')

  if (needsOffers && !hasOfferSignals) {
    jsonFields.push('  "offers": {')
    jsonFields.push('    "@type": "Offer",')
    jsonFields.push('    "price": "{{PRICE}}",')
    jsonFields.push('    "priceCurrency": "{{CURRENCY}}",')
    jsonFields.push('    "availability": "{{AVAILABILITY}}"')
    jsonFields.push('  },')
    placeholders.push('{{PRICE}}', '{{CURRENCY}}', '{{AVAILABILITY}}')
  }

  if (jsonFields.length === 0) return null

  const jsonLdBlock = [
    '<script type="application/ld+json">',
    '{',
    '  "@context": "https://schema.org/",',
    '  "@type": "Product",',
    ...jsonFields,
    '}',
    '</script>',
  ].join('\n')

  const sections = [
    {
      heading: 'Product JSON-LD Draft',
      body: jsonLdBlock,
      placeholders: [...new Set(placeholders)],
      instruction:
        'Add only missing fields to your product page structured data. Replace every placeholder with verified catalog values — do not invent product data.',
    },
  ]

  return buildOutput({
    ruleId: 'G011',
    title: 'Product Schema Fix Draft',
    explanation:
      evidence?.message ||
      'Use this Product JSON-LD draft to complete missing structured data fields. Only include values that match your product catalog.',
    sections,
    copyReadyText: joinSections(sections),
  })
}

function generateG012Assistant({ evidence, missing, detected }) {
  const known = parseG005DetectedIdentifiers(detected, evidence)
  const lines = []
  const placeholders = []

  for (const identifier of G005_IDENTIFIERS) {
    const isMissing =
      missingIncludes(missing, identifier.key) || missingIncludes(missing, identifier.label)
    const isDetected = known.has(identifier.key)

    if (isMissing && !isDetected) {
      lines.push(`${identifier.label}:`)
      lines.push(identifier.placeholder)
      lines.push('')
      placeholders.push(identifier.placeholder)
    }
  }

  if (lines.length === 0) return null

  const sections = [
    {
      heading: 'Product Identifier Fix Draft',
      body: lines.join('\n').trim(),
      placeholders,
      instruction:
        'Add only identifiers that match your product catalog. Do not invent GTIN, MPN, or brand values.',
    },
  ]

  return buildOutput({
    ruleId: 'G012',
    title: 'Product Identifier Fix Draft',
    explanation:
      evidence?.message ||
      'Use this draft to add missing product identifiers on the product detail page or in Product JSON-LD.',
    sections,
    copyReadyText: joinSections(sections),
  })
}

function generateM004Assistant({ evidence, missing, detected }) {
  const sections = []
  const placeholders = []
  const descriptionMissing = missingIncludes(missing, 'description')
  const descriptionDetected = hasDetectedSignal(detected, 'description')
  const insufficientDescription = /insufficient/i.test(evidence?.message || '')

  if ((descriptionMissing || insufficientDescription) && !descriptionDetected) {
    sections.push({
      heading: 'Product Description',
      body: '{{PRODUCT_DESCRIPTION}}',
      placeholders: ['{{PRODUCT_DESCRIPTION}}'],
      instruction: 'Replace with an accurate, factual product description. Do not copy generic marketing text.',
    })
    placeholders.push('{{PRODUCT_DESCRIPTION}}')
  } else if (insufficientDescription) {
    sections.push({
      heading: 'Product Description',
      body: '{{PRODUCT_DESCRIPTION}}',
      placeholders: ['{{PRODUCT_DESCRIPTION}}'],
      instruction: 'Expand the description with measurable product details you can verify.',
    })
    placeholders.push('{{PRODUCT_DESCRIPTION}}')
  }

  const specLines = []
  if (missingIncludes(missing, 'material') && !hasDetectedSignal(detected, 'material')) {
    specLines.push('Material:')
    specLines.push('{{MATERIAL}}')
    placeholders.push('{{MATERIAL}}')
  }
  if (missingIncludes(missing, 'size') && !hasDetectedSignal(detected, 'size', 'size information')) {
    specLines.push('Size:')
    specLines.push('{{SIZE}}')
    placeholders.push('{{SIZE}}')
  }
  if (
    missingIncludes(missing, 'specifications', 'specification') &&
    !hasDetectedSignal(detected, 'specifications', 'specification')
  ) {
    specLines.push('Specifications:')
    specLines.push('{{SPECIFICATIONS}}')
    placeholders.push('{{SPECIFICATIONS}}')
  }

  if (specLines.length > 0) {
    sections.push({
      heading: 'Specifications',
      body: specLines.join('\n'),
      placeholders: placeholders.filter((item) =>
        ['{{MATERIAL}}', '{{SIZE}}', '{{SPECIFICATIONS}}'].includes(item)
      ),
      instruction: 'Fill in only accurate product attributes. Do not invent specifications.',
    })
  }

  if (sections.length === 0) return null

  return buildOutput({
    ruleId: 'M004',
    title: 'Product Content Fix Draft',
    explanation:
      evidence?.message ||
      'Use this draft to strengthen measurable product content signals with verified details only.',
    sections,
    copyReadyText: joinSections(sections),
  })
}

function generateM005Assistant({ evidence, missing, detected }) {
  const sections = []
  const placeholders = []
  const lines = []

  if (missingIncludes(missing, 'reviews', 'review') && !hasDetectedSignal(detected, 'reviews', 'review')) {
    lines.push('Reviews:')
    lines.push('{{REVIEWS_SECTION}}')
    placeholders.push('{{REVIEWS_SECTION}}')
  }

  if (
    missingIncludes(missing, 'warranty', 'warranty information', 'guarantee') &&
    !hasDetectedSignal(detected, 'warranty', 'guarantee')
  ) {
    lines.push('Warranty:')
    lines.push('{{WARRANTY_TERMS}}')
    placeholders.push('{{WARRANTY_TERMS}}')
  }

  if (
    missingIncludes(missing, 'return', 'return information', 'returns') &&
    !hasDetectedSignal(detected, 'return', 'returns')
  ) {
    lines.push('Return Information:')
    lines.push('{{RETURN_POLICY}}')
    placeholders.push('{{RETURN_POLICY}}')
  }

  if (lines.length === 0) return null

  sections.push({
    heading: 'Product Trust Guidance',
    body: lines.join('\n'),
    placeholders,
    instruction:
      'Use placeholders for guidance only. Do not fabricate reviews, warranty periods, or return terms you do not offer.',
  })

  return buildOutput({
    ruleId: 'M005',
    title: 'Product Trust Fix Draft',
    explanation:
      evidence?.message ||
      'Use this guidance to add legitimate product trust signals. Never publish fabricated reviews or warranty claims.',
    sections,
    copyReadyText: joinSections(sections),
  })
}

/**
 * @param {{
 *   ruleId: string,
 *   evidence?: object,
 *   missing?: string[],
 *   detected?: string[],
 * }} input
 * @returns {object|null}
 */
export function generateFixAssistant({ ruleId, evidence = {}, missing = [], detected = [] } = {}) {
  if (!SUPPORTED_RULE_IDS.has(ruleId)) return null

  switch (ruleId) {
    case 'G005':
      return generateG005Assistant({ evidence, missing, detected })
    case 'G011':
      return generateG011Assistant({ evidence, missing, detected })
    case 'G012':
      return generateG012Assistant({ evidence, missing, detected })
    case 'G008':
      return generateG008Assistant({ evidence, missing, detected })
    case 'G010':
      return generateG010Assistant({ evidence, missing, detected })
    case 'M001':
    case 'T001':
      return generateContactAssistant({ ruleId, evidence, missing, detected })
    case 'M002':
      return generateM002Assistant({ evidence, missing, detected })
    case 'M003':
      return generateM003Assistant({ evidence, missing, detected })
    case 'M004':
      return generateM004Assistant({ evidence, missing, detected })
    case 'M005':
      return generateM005Assistant({ evidence, missing, detected })
    case 'P001':
      return generateP001Assistant({ evidence, missing, detected })
    case 'P002':
      return generateP002Assistant({ evidence, missing, detected })
    case 'P003':
      return generateP003Assistant({ evidence, missing, detected })
    default:
      return null
  }
}

export { SUPPORTED_RULE_IDS as FIX_ASSISTANT_RULE_IDS, RULE_TITLES as FIX_ASSISTANT_TITLES }
