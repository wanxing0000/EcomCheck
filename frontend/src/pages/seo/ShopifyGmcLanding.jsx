import SeoLandingPage from '../../components/SeoLandingPage'
import { getSeoLandingPage } from '../../data/seoPages.js'

export default function ShopifyGmcLanding() {
  const page = getSeoLandingPage('shopify-gmc')
  return <SeoLandingPage page={page} />
}
