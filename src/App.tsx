// ============================================================
// App Component — Routes & Providers
// ============================================================

import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from '@/hooks/useApp'
import { AppLayout } from '@/components/layout/AppLayout'
import { ToastProvider } from '@/components/feedback/Toast'
import { RouteMetadata } from '@/components/seo/RouteMetadata'

// Lazy loaded routes for performance (code splitting)
const Landing = lazy(() => import('@/pages/Landing').then(m => ({ default: m.Landing })))
const Dashboard = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })))
const ReviewsExplorer = lazy(() => import('@/pages/ReviewsExplorer').then(m => ({ default: m.ReviewsExplorer })))
const AnalyticsWorkspace = lazy(() => import('@/pages/AnalyticsWorkspace').then(m => ({ default: m.AnalyticsWorkspace })))
const TopicIntelligence = lazy(() => import('@/pages/TopicIntelligence').then(m => ({ default: m.TopicIntelligence })))
const Complaints = lazy(() => import('@/pages/Complaints').then(m => ({ default: m.Complaints })))
const AiInsights = lazy(() => import('@/pages/AiInsights').then(m => ({ default: m.AiInsights })))
const ModelHealth = lazy(() => import('@/pages/ModelHealth').then(m => ({ default: m.ModelHealth })))
const Reports = lazy(() => import('@/pages/Reports').then(m => ({ default: m.Reports })))
const Settings = lazy(() => import('@/pages/Settings').then(m => ({ default: m.Settings })))

const PageLoader = (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100%' }}>
    <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 20 }} />
  </div>
)

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <BrowserRouter>
          <RouteMetadata />
          <AppLayout>
            <Suspense fallback={PageLoader}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/reviews" element={<ReviewsExplorer />} />
                <Route path="/analytics" element={<AnalyticsWorkspace />} />
                <Route path="/topics" element={<TopicIntelligence />} />
                <Route path="/complaints" element={<Complaints />} />
                <Route path="/ai-insights" element={<AiInsights />} />
                <Route path="/model-health" element={<ModelHealth />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Suspense>
          </AppLayout>
        </BrowserRouter>
      </ToastProvider>
    </AppProvider>
  )
}
