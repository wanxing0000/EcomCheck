import { getScannedProductPages } from './_helpers.js'

const PRICE_TOLERANCE = 0.02

function normalizeCurrency(currency) {
  if (!currency || typeof currency !== 'string') return null
  return currency.trim().toUpperCase()
}

function analyzePagePricing(page) {
  const pricing = page.pricing
  const url = page.url

  if (!pricing) {
    return {
      url,
      schemaPrice: null,
      displayPrice: null,
      schemaCurrency: null,
      displayCurrency: null,
      currency: null,
      priceDifference: null,
      result: 'no_pricing',
      severity: null,
    }
  }

  const schemaPrice = pricing.schema?.price ?? null
  const displayPrice = pricing.display?.price ?? null
  const schemaCurrency = normalizeCurrency(pricing.schema?.currency)
  const displayCurrency = normalizeCurrency(pricing.display?.currency)
  const currency = schemaCurrency || displayCurrency

  if (schemaPrice == null) {
    return {
      url,
      schemaPrice: null,
      displayPrice,
      schemaCurrency,
      displayCurrency,
      currency,
      priceDifference: null,
      result: 'no_schema',
      severity: null,
    }
  }

  if (displayPrice == null) {
    return {
      url,
      schemaPrice,
      displayPrice: null,
      schemaCurrency,
      displayCurrency,
      currency,
      priceDifference: null,
      result: 'missing_display',
      severity: 'warning',
    }
  }

  const priceDifference = Math.abs(schemaPrice - displayPrice)
  const currencyMismatch =
    Boolean(schemaCurrency && displayCurrency) && schemaCurrency !== displayCurrency
  const priceMismatch = priceDifference >= PRICE_TOLERANCE

  if (currencyMismatch) {
    return {
      url,
      schemaPrice,
      displayPrice,
      schemaCurrency,
      displayCurrency,
      currency,
      priceDifference,
      result: 'currency_mismatch',
      severity: 'high',
    }
  }

  if (priceMismatch) {
    return {
      url,
      schemaPrice,
      displayPrice,
      schemaCurrency,
      displayCurrency,
      currency,
      priceDifference,
      result: 'price_mismatch',
      severity: 'high',
    }
  }

  return {
    url,
    schemaPrice,
    displayPrice,
    schemaCurrency,
    displayCurrency,
    currency,
    priceDifference,
    result: 'match',
    severity: 'ok',
  }
}

/** @type {import('../../_shared/types.js').Rule} */
export const productPriceConsistencyRule = {
  id: 'G006',
  name: 'Product Price Consistency',
  category: 'gmc',
  severity: 'high',
  description:
    'Product JSON-LD price and currency must match the visible product page price for Google Merchant Center.',
  check(auditData) {
    const pages = getScannedProductPages(auditData)

    if (pages.length === 0) {
      return {
        passed: false,
        message: 'No product pages scanned to verify price consistency.',
        recommendation:
          'Ensure product detail pages are discoverable so JSON-LD and visible prices can be compared.',
        priceRisks: {
          checked: 0,
          compared: 0,
          matched: 0,
          priceMismatch: 0,
          currencyMismatch: 0,
          missingDisplay: 0,
          details: [],
          pageWarnings: [],
          inconsistent: [],
          risks: [],
        },
      }
    }

    const details = pages.map(analyzePagePricing)
    const compared = details.filter((d) => d.schemaPrice != null && d.displayPrice != null)
    const matched = details.filter((d) => d.result === 'match')
    const priceMismatches = details.filter((d) => d.result === 'price_mismatch')
    const currencyMismatches = details.filter((d) => d.result === 'currency_mismatch')
    const missingDisplay = details.filter((d) => d.result === 'missing_display')

    const pageWarnings = missingDisplay.map((item) => ({
      url: item.url,
      severity: 'warning',
      message: `Visible display price not detected on ${item.url}. Schema price is ${item.schemaPrice}${item.currency ? ` ${item.currency}` : ''}.`,
    }))

    const inconsistent = [...priceMismatches, ...currencyMismatches].map((item) => ({
      url: item.url,
      schemaPrice: item.schemaPrice,
      displayPrice: item.displayPrice,
      schemaCurrency: item.schemaCurrency,
      displayCurrency: item.displayCurrency,
      currency: item.currency,
      priceDifference: item.priceDifference,
      result: item.result,
    }))

    const risks = [
      ...currencyMismatches.map(
        (item) =>
          `Currency mismatch on ${item.url}: schema ${item.schemaCurrency} vs display ${item.displayCurrency}.`
      ),
      ...priceMismatches.map(
        (item) =>
          `Price mismatch on ${item.url}: schema ${item.schemaPrice} vs display ${item.displayPrice}${item.currency ? ` ${item.currency}` : ''} (diff ${item.priceDifference?.toFixed(2)}).`
      ),
      ...pageWarnings.map((item) => item.message),
    ]

    const priceRisks = {
      checked: pages.length,
      compared: compared.length,
      matched: matched.length,
      consistent: matched.length,
      priceMismatch: priceMismatches.length,
      currencyMismatch: currencyMismatches.length,
      missingDisplay: missingDisplay.length,
      details,
      pageWarnings,
      inconsistent,
      risks,
    }

    if (priceMismatches.length > 0 || currencyMismatches.length > 0) {
      const parts = []
      if (priceMismatches.length > 0) {
        parts.push(`price mismatch on ${priceMismatches.length} page(s)`)
      }
      if (currencyMismatches.length > 0) {
        parts.push(`currency mismatch on ${currencyMismatches.length} page(s)`)
      }

      return {
        passed: false,
        message: `Product pricing inconsistency detected: ${parts.join('; ')}.`,
        recommendation:
          'Align Product JSON-LD offers.price and priceCurrency with the customer-visible price on each product page.',
        priceRisks,
      }
    }

    if (missingDisplay.length > 0 && matched.length === 0 && compared.length === 0) {
      return {
        passed: true,
        message: `Display price missing on ${missingDisplay.length}/${pages.length} scanned page(s); schema prices present but not comparable.`,
        recommendation:
          'Ensure product pages show a visible price that matches your Product JSON-LD offers.price.',
        priceRisks,
      }
    }

    const suffix =
      missingDisplay.length > 0
        ? ` (${missingDisplay.length} page(s) missing visible display price)`
        : ''

    return {
      passed: true,
      message: `Product JSON-LD price and currency match visible prices on ${matched.length}/${pages.length} scanned page(s)${suffix}.`,
      priceRisks,
    }
  },
}
