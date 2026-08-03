import SeoLandingPage from '../../components/SeoLandingPage'
import { getSeoLandingPage } from '../../data/seoPages.js'

export default function WooCommerceGmcLanding() {
  const page = getSeoLandingPage('woocommerce-gmc')
  return <SeoLandingPage page={page} />
}
