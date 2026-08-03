import { Routes, Route } from 'react-router-dom'

import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import Footer from './components/Footer'
import { AuthProvider } from './context/AuthContext'
import AnalyticsProvider from './components/AnalyticsProvider'

import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import DashboardReports from './pages/DashboardReports'
import GmcAudit from './pages/GmcAudit'
import SeoAudit from './pages/SeoAudit'
import Scan from './pages/Scan'
import Report from './pages/Report'
import PublicReport from './pages/PublicReport'
import ShopifyGmcLanding from './pages/seo/ShopifyGmcLanding'
import WooCommerceGmcLanding from './pages/seo/WooCommerceGmcLanding'
import GuidePage from './pages/seo/GuidePage'
import BlogIndex from './pages/seo/BlogIndex'
import BlogPost from './pages/seo/BlogPost'

export default function App() {
  return (
    <AuthProvider>
      <AnalyticsProvider>
        <div className="flex min-h-screen flex-col">
        <Navbar />

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard/reports"
              element={
                <ProtectedRoute>
                  <DashboardReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/audit/gmc" element={<GmcAudit />} />
            <Route path="/audit/seo" element={<SeoAudit />} />
            <Route path="/audit/shopify-gmc" element={<ShopifyGmcLanding />} />
            <Route path="/audit/woocommerce-gmc" element={<WooCommerceGmcLanding />} />
            <Route path="/guides/:slug" element={<GuidePage />} />
            <Route path="/blog" element={<BlogIndex />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/scan" element={<Scan />} />
            <Route path="/report/:id" element={<PublicReport />} />
            <Route path="/report" element={<Report />} />
          </Routes>
        </main>

        <Footer />
        </div>
      </AnalyticsProvider>
    </AuthProvider>
  )
}
