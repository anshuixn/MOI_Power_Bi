import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const ROUTE_METADATA: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'ReviewBand | Customer Review Intelligence',
    description: 'Explore the ReviewBand demo: turn customer feedback into clear sentiment, topic, and complaint signals.',
  },
  '/dashboard': {
    title: 'Dashboard | ReviewBand',
    description: 'Review the ReviewBand sample dataset overview, sentiment summary, and customer feedback signals.',
  },
  '/reviews': {
    title: 'Reviews | ReviewBand',
    description: 'Search and inspect sample customer reviews, ratings, sentiment, and product feedback in ReviewBand.',
  },
  '/analytics': {
    title: 'Analytics | ReviewBand',
    description: 'Explore rating, sentiment, and source breakdowns from the ReviewBand sample review dataset.',
  },
  '/topics': {
    title: 'Topics | ReviewBand',
    description: 'Explore recurring product and service topics identified in ReviewBand sample customer feedback.',
  },
  '/complaints': {
    title: 'Complaints | ReviewBand',
    description: 'Review sample complaint categories, severity, and active counts in the ReviewBand demo.',
  },
  '/ai-insights': {
    title: 'AI Insights | ReviewBand',
    description: 'Explore illustrative insights generated from the ReviewBand sample review dataset.',
  },
  '/model-health': {
    title: 'Model Health | ReviewBand',
    description: 'Inspect illustrative model metrics and component status in the ReviewBand frontend demo.',
  },
  '/reports': {
    title: 'Reports | ReviewBand',
    description: 'Create and inspect sample customer feedback reports in the ReviewBand demo.',
  },
  '/settings': {
    title: 'Settings | ReviewBand',
    description: 'Adjust display, motion, and refresh preferences for the ReviewBand frontend demo.',
  },
}

function upsertMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.append(element)
  }
  element.content = content
}

export function RouteMetadata() {
  const { pathname } = useLocation()

  useEffect(() => {
    const metadata = ROUTE_METADATA[pathname] ?? {
      title: 'Page Not Found | ReviewBand',
      description: 'The requested ReviewBand page could not be found.',
    }
    const canonicalUrl = new URL(pathname, window.location.origin).toString()

    document.title = metadata.title
    upsertMeta('name', 'description', metadata.description)
    upsertMeta('property', 'og:type', 'website')
    upsertMeta('property', 'og:title', metadata.title)
    upsertMeta('property', 'og:description', metadata.description)
    upsertMeta('property', 'og:url', canonicalUrl)
    upsertMeta('name', 'twitter:card', 'summary')
    upsertMeta('name', 'twitter:title', metadata.title)
    upsertMeta('name', 'twitter:description', metadata.description)

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.append(canonical)
    }
    canonical.href = canonicalUrl
  }, [pathname])

  return null
}
