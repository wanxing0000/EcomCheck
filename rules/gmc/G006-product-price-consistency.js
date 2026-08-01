import { getScannedProductPages } from './_helpers.js'

/** @type {import('../types.js').Rule} */
export const productPriceConsistencyRule = {
  id: 'G006',
  name: 'Product Price Consistency',
  category: 'gmc',
  severity: 'warning',
  description:
    'Product JSON-LD price should match the price displayed on the product page to avoid GMC disapproval risk.',
  check(auditData) {
    const pages = getScannedProductPages(auditData)

    if (pages.length === 0) {
      return {
        passed: false,
        message: 'No product pages scanned to verify price consistency.',
        recommendation:
          'Ensure product detail pages are discoverable so JSON-LD and visible prices can be compared.',
        priceRisks: { checked: 0, compared: 0, consistent: 0, inconsistent: [], risks: [] },
      }
    }

    const compared = pages.filter((p) => p.priceConsistency?.checked && p.priceConsistency?.schemaPrice != null)
    const inconsistent = pages
      .filter((p) => p.priceConsistency?.checked && p.priceConsistency?.consistent === false)
      .map((p) => ({
        url: p.url,
        schemaPrice: p.priceConsistency.schemaPrice,
        displayPrice: p.priceConsistency.displayPrice,
        currency: p.priceConsistency.currency,
        difference: p.priceConsistency.difference,
      }))

    const priceRisks = {
      checked: pages.length,
      compared: compared.length,
      consistent: compared.filter((p) => p.priceConsistency?.consistent === true).length,
      inconsistent,
      risks: inconsistent.map(
        (item) =>
          `Price mismatch on ${item.url}: schema ${item.schemaPrice} vs displayed ${item.displayPrice}${item.currency ? ` ${item.currency}` : ''}.`
      ),
    }

    if (compared.length === 0) {
      return {
        passed: true,
        message: 'Product pages scanned but price comparison data was insufficient.',
        priceRisks,
      }
    }

    if (inconsistent.length > 0) {
      return {
        passed: false,
        message: `Price mismatch detected on ${inconsistent.length}/${compared.length} product page(s) with comparable prices.`,
        recommendation:
          'Align Product JSON-LD offers.price with the customer-visible price. Mismatches can trigger Google Merchant Center disapprovals.',
        priceRisks,
      }
    }

    return {
      passed: true,
      message: `Product JSON-LD price matches displayed price on ${compared.length}/${pages.length} scanned page(s).`,
      priceRisks,
    }
  },
}
