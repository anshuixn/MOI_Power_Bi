// ============================================================
// ReviewBand Mock Data — Deterministic Fictional Data
// All values are mathematically coherent.
// ============================================================

import type {
  Product,
  Topic,
  Review,
  Complaint,
  Insight,
  ModelHealth,
  SentimentDataPoint,
  ModelHistoryEntry,
  ReviewSource,
} from '@/types'

// ── Products ──────────────────────────────────────────────────
export const PRODUCTS: Product[] = [
  { id: 'aero-blender', name: 'Aero Blender', sku: 'AB-1001', category: 'Kitchen' },
  { id: 'lumen-desk-lamp', name: 'Lumen Desk Lamp', sku: 'LD-2002', category: 'Lighting' },
  { id: 'trailpack-30l', name: 'TrailPack 30L', sku: 'TP-3003', category: 'Outdoor' },
  { id: 'nimbus-earbuds', name: 'Nimbus Earbuds', sku: 'NE-4004', category: 'Audio' },
]

// ── Topics ────────────────────────────────────────────────────
export const TOPICS: Topic[] = [
  {
    id: 'product-quality',
    name: 'Product Quality',
    mentions: 31200,
    positivePct: 68.4,
    neutralPct: 19.2,
    negativePct: 12.4,
    keywords: ['quality', 'durable', 'build', 'material', 'finish', 'premium'],
    trend: 'rising',
    trendPct: 4.2,
    sampleReviewIds: ['r-001', 'r-002', 'r-003'],
  },
  {
    id: 'delivery',
    name: 'Delivery',
    mentions: 24850,
    positivePct: 51.2,
    neutralPct: 22.6,
    negativePct: 26.2,
    keywords: ['delivery', 'shipping', 'arrived', 'packaging', 'late', 'fast'],
    trend: 'falling',
    trendPct: -8.1,
    sampleReviewIds: ['r-004', 'r-005', 'r-006'],
  },
  {
    id: 'customer-support',
    name: 'Customer Support',
    mentions: 19640,
    positivePct: 58.7,
    neutralPct: 24.1,
    negativePct: 17.2,
    keywords: ['support', 'service', 'response', 'helpful', 'resolved', 'team'],
    trend: 'stable',
    trendPct: 0.8,
    sampleReviewIds: ['r-007', 'r-008', 'r-009'],
  },
  {
    id: 'pricing',
    name: 'Pricing',
    mentions: 15320,
    positivePct: 42.1,
    neutralPct: 29.9,
    negativePct: 28.0,
    keywords: ['price', 'value', 'expensive', 'affordable', 'worth', 'cost'],
    trend: 'stable',
    trendPct: -1.3,
    sampleReviewIds: ['r-010', 'r-011', 'r-012'],
  },
  {
    id: 'features',
    name: 'Features',
    mentions: 12980,
    positivePct: 72.3,
    neutralPct: 18.4,
    negativePct: 9.3,
    keywords: ['feature', 'function', 'battery', 'connectivity', 'settings', 'app'],
    trend: 'rising',
    trendPct: 6.7,
    sampleReviewIds: ['r-013', 'r-014', 'r-015'],
  },
]

// ── Complaints ────────────────────────────────────────────────
export const COMPLAINTS: Complaint[] = [
  {
    id: 'late-delivery',
    category: 'Late Delivery',
    activeCount: 96,
    severity: 'high',
    trend: 'rising',
    trendPct: 18.4,
    description: 'Orders arriving significantly beyond estimated delivery window.',
    exampleReviewIds: ['r-004', 'r-005'],
    status: 'investigating',
  },
  {
    id: 'defective-product',
    category: 'Defective Product',
    activeCount: 67,
    severity: 'critical',
    trend: 'stable',
    trendPct: 2.1,
    description: 'Products arriving non-functional or failing within first week of use.',
    exampleReviewIds: ['r-016', 'r-017'],
    status: 'open',
  },
  {
    id: 'damaged-packaging',
    category: 'Damaged Packaging',
    activeCount: 58,
    severity: 'medium',
    trend: 'falling',
    trendPct: -5.2,
    description: 'Packaging damaged in transit, sometimes affecting product integrity.',
    exampleReviewIds: ['r-018', 'r-019'],
    status: 'investigating',
  },
  {
    id: 'refund-delays',
    category: 'Refund Delays',
    activeCount: 47,
    severity: 'high',
    trend: 'rising',
    trendPct: 9.3,
    description: 'Customers experiencing refund processing delays beyond 10 business days.',
    exampleReviewIds: ['r-020', 'r-021'],
    status: 'open',
  },
  {
    id: 'unresponsive-support',
    category: 'Unresponsive Support',
    activeCount: 41,
    severity: 'medium',
    trend: 'falling',
    trendPct: -12.1,
    description: 'Support tickets not receiving responses within SLA window.',
    exampleReviewIds: ['r-022', 'r-023'],
    status: 'open',
  },
  {
    id: 'billing-errors',
    category: 'Billing Errors',
    activeCount: 33,
    severity: 'high',
    trend: 'stable',
    trendPct: 1.4,
    description: 'Incorrect charges appearing on customer accounts.',
    exampleReviewIds: ['r-024', 'r-025'],
    status: 'open',
  },
]
// Total: 96+67+58+47+41+33 = 342 ✓

// ── Rating Distribution ───────────────────────────────────────
export const RATING_DISTRIBUTION: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 1000,
  2: 5220,
  3: 21440,
  4: 38920,
  5: 61850,
}

export const BASELINE_TOTAL_REVIEWS = Object.values(RATING_DISTRIBUTION)
  .reduce((sum, count) => sum + count, 0)

export const BASELINE_AVERAGE_RATING = Number(
  (
    Object.entries(RATING_DISTRIBUTION)
      .reduce((sum, [rating, count]) => sum + Number(rating) * count, 0) /
    BASELINE_TOTAL_REVIEWS
  ).toFixed(2)
)

export const BASELINE_ACTIVE_COMPLAINTS = COMPLAINTS
  .reduce((sum, complaint) => sum + complaint.activeCount, 0)

// ── Reviews ───────────────────────────────────────────────────
export const REVIEWS: Review[] = [
  {
    id: 'r-001',
    text: 'Absolutely exceptional build quality. The Aero Blender feels premium from the moment you unbox it. Quiet operation and powerful performance make this worth every penny.',
    rating: 5,
    productId: 'aero-blender',
    productName: 'Aero Blender',
    source: 'web_store',
    date: '2024-11-28',
    authorInitial: 'S',
    sentiment: { label: 'positive', positive: 0.94, neutral: 0.04, negative: 0.02, confidence: 0.97 },
    topicIds: ['product-quality', 'features'],
    complaintId: null,
    piiStatus: { isClean: true, redactedFields: [], detectedEntities: [], processedAt: '2024-11-28T10:12:00Z' },
  },
  {
    id: 'r-002',
    text: 'The quality of the lamp is outstanding. Perfect desk companion for long work sessions. The adjustable brightness and color temperature are exactly what I needed.',
    rating: 5,
    productId: 'lumen-desk-lamp',
    productName: 'Lumen Desk Lamp',
    source: 'web_store',
    date: '2024-11-25',
    authorInitial: 'M',
    sentiment: { label: 'positive', positive: 0.91, neutral: 0.07, negative: 0.02, confidence: 0.95 },
    topicIds: ['product-quality', 'features'],
    complaintId: null,
    piiStatus: { isClean: true, redactedFields: [], detectedEntities: [], processedAt: '2024-11-25T14:30:00Z' },
  },
  {
    id: 'r-003',
    text: 'Solid backpack. The material feels durable and the fit is comfortable even with a full load. Plenty of organisation pockets. Will last years.',
    rating: 4,
    productId: 'trailpack-30l',
    productName: 'TrailPack 30L',
    source: 'marketplace',
    date: '2024-11-22',
    authorInitial: 'J',
    sentiment: { label: 'positive', positive: 0.82, neutral: 0.14, negative: 0.04, confidence: 0.91 },
    topicIds: ['product-quality'],
    complaintId: null,
    piiStatus: { isClean: true, redactedFields: [], detectedEntities: [], processedAt: '2024-11-22T09:15:00Z' },
  },
  {
    id: 'r-004',
    text: 'The product is excellent, but delivery took much longer than expected. Packaging was also slightly damaged when it arrived. Product itself works perfectly.',
    rating: 3,
    productId: 'aero-blender',
    productName: 'Aero Blender',
    source: 'web_store',
    date: '2024-11-20',
    authorInitial: 'P',
    sentiment: { label: 'neutral', positive: 0.38, neutral: 0.41, negative: 0.21, confidence: 0.84 },
    topicIds: ['delivery', 'product-quality'],
    complaintId: 'late-delivery',
    piiStatus: { isClean: true, redactedFields: [], detectedEntities: [], processedAt: '2024-11-20T11:45:00Z' },
  },
  {
    id: 'r-005',
    text: 'Waited 3 weeks for a product that was listed as 3-5 days shipping. When it finally arrived the box was crushed. Customer service was slow to respond.',
    rating: 2,
    productId: 'trailpack-30l',
    productName: 'TrailPack 30L',
    source: 'marketplace',
    date: '2024-11-18',
    authorInitial: 'K',
    sentiment: { label: 'negative', positive: 0.08, neutral: 0.19, negative: 0.73, confidence: 0.92 },
    topicIds: ['delivery', 'customer-support'],
    complaintId: 'late-delivery',
    piiStatus: { isClean: true, redactedFields: [], detectedEntities: [], processedAt: '2024-11-18T16:22:00Z' },
  },
  {
    id: 'r-006',
    text: 'Fast delivery and excellent packaging. The earbuds arrived in perfect condition and set up was effortless. Sound quality is impressive at this price point.',
    rating: 5,
    productId: 'nimbus-earbuds',
    productName: 'Nimbus Earbuds',
    source: 'mobile_app',
    date: '2024-11-15',
    authorInitial: 'T',
    sentiment: { label: 'positive', positive: 0.93, neutral: 0.05, negative: 0.02, confidence: 0.96 },
    topicIds: ['delivery', 'features', 'pricing'],
    complaintId: null,
    piiStatus: { isClean: true, redactedFields: [], detectedEntities: [], processedAt: '2024-11-15T08:10:00Z' },
  },
  {
    id: 'r-007',
    text: 'Support resolved my issue within hours. Very impressed by the responsiveness. Replaced my faulty unit with no hassle whatsoever.',
    rating: 5,
    productId: 'aero-blender',
    productName: 'Aero Blender',
    source: 'web_store',
    date: '2024-11-12',
    authorInitial: 'R',
    sentiment: { label: 'positive', positive: 0.95, neutral: 0.04, negative: 0.01, confidence: 0.98 },
    topicIds: ['customer-support'],
    complaintId: null,
    piiStatus: { isClean: true, redactedFields: [], detectedEntities: [], processedAt: '2024-11-12T13:55:00Z' },
  },
  {
    id: 'r-008',
    text: 'Mixed experience. The lamp is good but I had a billing issue that took two weeks to resolve. The support team was polite but the process was slow.',
    rating: 3,
    productId: 'lumen-desk-lamp',
    productName: 'Lumen Desk Lamp',
    source: 'survey',
    date: '2024-11-10',
    authorInitial: 'A',
    sentiment: { label: 'neutral', positive: 0.31, neutral: 0.44, negative: 0.25, confidence: 0.79 },
    topicIds: ['customer-support', 'pricing'],
    complaintId: 'billing-errors',
    piiStatus: { isClean: true, redactedFields: [], detectedEntities: [], processedAt: '2024-11-10T10:00:00Z' },
  },
  {
    id: 'r-009',
    text: 'The battery drains much faster than advertised. Listed as 8 hours but I barely get 3. Disappointed given the price. Contacted support but no useful response yet.',
    rating: 2,
    productId: 'nimbus-earbuds',
    productName: 'Nimbus Earbuds',
    source: 'mobile_app',
    date: '2024-11-08',
    authorInitial: 'D',
    sentiment: { label: 'negative', positive: 0.07, neutral: 0.18, negative: 0.75, confidence: 0.93 },
    topicIds: ['features', 'pricing', 'customer-support'],
    complaintId: 'unresponsive-support',
    piiStatus: { isClean: true, redactedFields: [], detectedEntities: [], processedAt: '2024-11-08T19:30:00Z' },
  },
  {
    id: 'r-010',
    text: 'Excellent value for money. The TrailPack is sturdy, well-designed, and handles all conditions. Bought it for a 5-day trek and it exceeded expectations.',
    rating: 5,
    productId: 'trailpack-30l',
    productName: 'TrailPack 30L',
    source: 'social',
    date: '2024-11-05',
    authorInitial: 'L',
    sentiment: { label: 'positive', positive: 0.96, neutral: 0.03, negative: 0.01, confidence: 0.97 },
    topicIds: ['product-quality', 'pricing'],
    complaintId: null,
    piiStatus: { isClean: true, redactedFields: [], detectedEntities: [], processedAt: '2024-11-05T07:45:00Z' },
  },
  {
    id: 'r-011',
    text: 'Received a defective unit. The blender motor made a grinding noise from day one and stopped working after a week. Still waiting for replacement.',
    rating: 1,
    productId: 'aero-blender',
    productName: 'Aero Blender',
    source: 'web_store',
    date: '2024-11-03',
    authorInitial: 'F',
    sentiment: { label: 'negative', positive: 0.04, neutral: 0.12, negative: 0.84, confidence: 0.95 },
    topicIds: ['product-quality', 'customer-support'],
    complaintId: 'defective-product',
    piiStatus: { isClean: true, redactedFields: [], detectedEntities: [], processedAt: '2024-11-03T15:20:00Z' },
  },
  {
    id: 'r-012',
    text: 'Easy to set up and works exactly as described. The wireless connectivity is rock-solid and the companion app is intuitive. Highly recommended.',
    rating: 5,
    productId: 'nimbus-earbuds',
    productName: 'Nimbus Earbuds',
    source: 'mobile_app',
    date: '2024-11-01',
    authorInitial: 'C',
    sentiment: { label: 'positive', positive: 0.92, neutral: 0.06, negative: 0.02, confidence: 0.96 },
    topicIds: ['features'],
    complaintId: null,
    piiStatus: { isClean: true, redactedFields: [], detectedEntities: [], processedAt: '2024-11-01T11:00:00Z' },
  },
  {
    id: 'r-013',
    text: 'Product quality was good, but delivery was delayed by 10 days with no proactive communication. I had to chase the courier myself.',
    rating: 3,
    productId: 'lumen-desk-lamp',
    productName: 'Lumen Desk Lamp',
    source: 'marketplace',
    date: '2024-10-28',
    authorInitial: 'B',
    sentiment: { label: 'neutral', positive: 0.29, neutral: 0.48, negative: 0.23, confidence: 0.81 },
    topicIds: ['product-quality', 'delivery'],
    complaintId: 'late-delivery',
    piiStatus: { isClean: true, redactedFields: [], detectedEntities: [], processedAt: '2024-10-28T12:30:00Z' },
  },
  {
    id: 'r-014',
    text: 'The pricing feels a bit steep compared to alternatives, but the quality justifies it. I have been a customer for 2 years and standards remain consistently high.',
    rating: 4,
    productId: 'aero-blender',
    productName: 'Aero Blender',
    source: 'survey',
    date: '2024-10-25',
    authorInitial: 'N',
    sentiment: { label: 'positive', positive: 0.71, neutral: 0.22, negative: 0.07, confidence: 0.88 },
    topicIds: ['pricing', 'product-quality'],
    complaintId: null,
    piiStatus: { isClean: true, redactedFields: [], detectedEntities: [], processedAt: '2024-10-25T09:15:00Z' },
  },
  {
    id: 'r-015',
    text: 'Charged twice for one order. The support team acknowledged the error but the refund took 18 days. Not acceptable for a brand at this price point.',
    rating: 2,
    productId: 'nimbus-earbuds',
    productName: 'Nimbus Earbuds',
    source: 'web_store',
    date: '2024-10-22',
    authorInitial: 'G',
    sentiment: { label: 'negative', positive: 0.05, neutral: 0.14, negative: 0.81, confidence: 0.94 },
    topicIds: ['pricing', 'customer-support'],
    complaintId: 'billing-errors',
    piiStatus: { isClean: true, redactedFields: [], detectedEntities: [], processedAt: '2024-10-22T17:40:00Z' },
  },
]

// ── Spotlight Review ──────────────────────────────────────────
export const SPOTLIGHT_REVIEW: Review = REVIEWS[3] // r-004

// ── Insights ──────────────────────────────────────────────────
export const INSIGHTS: Insight[] = [
  {
    id: 'ins-001',
    kind: 'trend_detected',
    title: 'Delivery Negative Sentiment Surge',
    summary: 'Delivery-related negative reviews rose 18% over the last 14 days, concentrated in two shipping regions. Peak impact on orders placed Tuesdays.',
    confidence: 0.94,
    impact: 'high',
    topicId: 'delivery',
    productId: null,
    generatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    isNew: true,
  },
  {
    id: 'ins-002',
    kind: 'alert',
    title: 'Nimbus Earbuds Battery Complaints Doubled',
    summary: 'Mentions of battery life for Nimbus Earbuds doubled this week with predominantly negative sentiment. Firmware update may be required.',
    confidence: 0.91,
    impact: 'high',
    topicId: 'features',
    productId: 'nimbus-earbuds',
    generatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    isNew: true,
  },
  {
    id: 'ins-003',
    kind: 'opportunity',
    title: 'Support Speed Drives Aero Blender Rating',
    summary: 'Customers who mention fast support responses rate Aero Blender 0.6 stars higher on average. Prioritising tier-1 response time could lift NPS.',
    confidence: 0.87,
    impact: 'medium',
    topicId: 'customer-support',
    productId: 'aero-blender',
    generatedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    isNew: false,
  },
  {
    id: 'ins-004',
    kind: 'alert',
    title: 'TrailPack Accounts for 41% of Damage Complaints',
    summary: 'TrailPack 30L accounts for 41% of all damage complaints despite representing 22% of review volume. Packaging supplier review recommended.',
    confidence: 0.96,
    impact: 'critical',
    topicId: 'delivery',
    productId: 'trailpack-30l',
    generatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    isNew: false,
  },
  {
    id: 'ins-005',
    kind: 'summary',
    title: 'Pricing Sentiment Stable with Negative Undertone',
    summary: 'Pricing sentiment is stable at 28% negative but has not improved over 90 days. Value proposition messaging may need revisiting.',
    confidence: 0.82,
    impact: 'medium',
    topicId: 'pricing',
    productId: null,
    generatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    isNew: false,
  },
  {
    id: 'ins-006',
    kind: 'opportunity',
    title: 'Feature Satisfaction Highest in 6 Months',
    summary: 'Feature-related positive sentiment at 72.3% is the highest recorded in six months. Recent firmware updates appear to be well-received.',
    confidence: 0.89,
    impact: 'low',
    topicId: 'features',
    productId: null,
    generatedAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
    isNew: false,
  },
  {
    id: 'ins-007',
    kind: 'anomaly',
    title: 'Unusual Rating Drop — Marketplace Channel',
    summary: 'Average rating on Marketplace dropped 0.4 stars over 7 days. Pattern does not match Web Store or Mobile App channels for same products.',
    confidence: 0.78,
    impact: 'medium',
    topicId: null,
    productId: null,
    generatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    isNew: false,
  },
]

// ── Sentiment Trend (30-day, Nov 2024) ───────────────────────
export const SENTIMENT_TREND: SentimentDataPoint[] = (() => {
  const base = [
    { p: 60.2, n: 23.1, ng: 16.7 },
    { p: 61.0, n: 22.8, ng: 16.2 },
    { p: 60.8, n: 22.5, ng: 16.7 },
    { p: 61.4, n: 22.1, ng: 16.5 },
    { p: 62.0, n: 21.8, ng: 16.2 },
    { p: 61.7, n: 22.0, ng: 16.3 },
    { p: 62.3, n: 21.4, ng: 16.3 },
    { p: 63.1, n: 21.2, ng: 15.7 },
    { p: 62.8, n: 21.5, ng: 15.7 },
    { p: 63.4, n: 21.0, ng: 15.6 },
    { p: 63.0, n: 21.3, ng: 15.7 },
    { p: 62.5, n: 21.4, ng: 16.1 },
    { p: 61.8, n: 21.8, ng: 16.4 },
    { p: 61.4, n: 22.0, ng: 16.6 },
    { p: 61.9, n: 21.7, ng: 16.4 },
    { p: 62.4, n: 21.5, ng: 16.1 },
    { p: 63.0, n: 21.2, ng: 15.8 },
    { p: 63.5, n: 20.9, ng: 15.6 },
    { p: 63.8, n: 20.7, ng: 15.5 },
    { p: 64.1, n: 20.5, ng: 15.4 },
    { p: 63.7, n: 20.8, ng: 15.5 },
    { p: 63.2, n: 21.1, ng: 15.7 },
    { p: 62.8, n: 21.3, ng: 15.9 },
    { p: 62.4, n: 21.4, ng: 16.2 },
    { p: 62.2, n: 21.3, ng: 16.5 },
    { p: 62.0, n: 21.4, ng: 16.6 },
    { p: 62.1, n: 21.3, ng: 16.6 },
    { p: 62.3, n: 21.2, ng: 16.5 },
    { p: 62.4, n: 21.1, ng: 16.5 },
    { p: 62.4, n: 21.1, ng: 16.5 },
  ]
  const rawReviewCounts = base.map((_, i) =>
    Math.round(4100 + i * 88 + Math.sin(i * 0.7) * 200)
  )
  const rawTotal = rawReviewCounts.reduce((sum, count) => sum + count, 0)
  let assignedReviews = 0

  return base.map((d, i) => {
    const date = new Date(2024, 10, i + 1)
    const reviewCount = i === base.length - 1
      ? BASELINE_TOTAL_REVIEWS - assignedReviews
      : Math.round(rawReviewCounts[i] * BASELINE_TOTAL_REVIEWS / rawTotal)
    assignedReviews += reviewCount

    return {
      date: date.toISOString().split('T')[0],
      positive: d.p,
      neutral: d.n,
      negative: d.ng,
      reviewCount,
    }
  })
})()

// ── Model History ─────────────────────────────────────────────
export const MODEL_HISTORY: ModelHistoryEntry[] = [
  { date: '2024-05-01', accuracy: 91.2, f1: 0.891, drift: 0.02 },
  { date: '2024-06-01', accuracy: 91.8, f1: 0.898, drift: 0.02 },
  { date: '2024-07-01', accuracy: 92.4, f1: 0.904, drift: 0.03 },
  { date: '2024-07-15', accuracy: 93.1, f1: 0.911, drift: 0.02, event: 'Retrained' },
  { date: '2024-08-01', accuracy: 93.0, f1: 0.910, drift: 0.03 },
  { date: '2024-09-01', accuracy: 93.6, f1: 0.916, drift: 0.04 },
  { date: '2024-10-01', accuracy: 93.8, f1: 0.918, drift: 0.04, event: 'Retrained' },
  { date: '2024-11-01', accuracy: 94.3, f1: 0.921, drift: 0.04 },
]

// ── Model Health ──────────────────────────────────────────────
export const MODEL_HEALTH_DATA: ModelHealth = {
  overallStatus: 'online',
  reviewsProcessedToday: 4812,
  queueDepth: 0,
  lastValidation: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  driftScore: 0.04,
  components: [
    { id: 'ingestion', name: 'Ingestion', status: 'online', lastChecked: new Date().toISOString() },
    { id: 'sentiment-model', name: 'Sentiment Model', status: 'online', metric: 'Accuracy', metricValue: 94.3, lastChecked: new Date().toISOString() },
    { id: 'topic-model', name: 'Topic Model', status: 'online', metric: 'F1', metricValue: 92.1, lastChecked: new Date().toISOString() },
    { id: 'complaint-classifier', name: 'Complaint Classifier', status: 'online', metric: 'Precision', metricValue: 92.8, lastChecked: new Date().toISOString() },
    { id: 'pii-scrubber', name: 'PII Scrubber', status: 'online', lastChecked: new Date().toISOString() },
  ],
  sentimentModel: {
    name: 'Sentiment Model',
    accuracy: 0.943,
    precision: 0.938,
    recall: 0.941,
    f1: 0.939,
    macroF1: 0.921,
    latencyAvgMs: 118,
    latencyP95Ms: 240,
    drift: 0.04,
    lastRetrained: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'online',
  },
  topicModel: {
    name: 'Topic Model',
    accuracy: 0.926,
    precision: 0.919,
    recall: 0.924,
    f1: 0.921,
    macroF1: 0.908,
    latencyAvgMs: 94,
    latencyP95Ms: 188,
    drift: 0.03,
    lastRetrained: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'online',
  },
  complaintClassifier: {
    name: 'Complaint Classifier',
    accuracy: 0.928,
    precision: 0.932,
    recall: 0.917,
    f1: 0.924,
    macroF1: 0.912,
    latencyAvgMs: 76,
    latencyP95Ms: 152,
    drift: 0.02,
    lastRetrained: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'online',
  },
  modelHistory: MODEL_HISTORY,
}

export const BASELINE_SENTIMENT = {
  positive: SENTIMENT_TREND.at(-1)?.positive ?? 62.4,
  neutral: SENTIMENT_TREND.at(-1)?.neutral ?? 21.1,
  negative: SENTIMENT_TREND.at(-1)?.negative ?? 16.5,
}

// ── Source Breakdown ──────────────────────────────────────────
export const SOURCE_BREAKDOWN: Record<ReviewSource, number> = {
  web_store: 38520,
  mobile_app: 31480,
  marketplace: 27640,
  survey: 18920,
  social: 11870,
}
// Total: 128,430 ✓

// ── Product Breakdown ─────────────────────────────────────────
export const PRODUCT_BREAKDOWN: Record<string, number> = {
  'aero-blender': 38210,
  'lumen-desk-lamp': 29840,
  'trailpack-30l': 33650,
  'nimbus-earbuds': 26730,
}
// Total: 128,430 ✓

// ── Sparkline data (7 points, % change-based) ─────────────────
const spark = (base: number[], scale = 1): number[] =>
  base.map(v => parseFloat((v * scale).toFixed(1)))

export const SPARKLINES = {
  totalReviews: spark([3800, 4100, 3950, 4400, 4250, 4620, 4810]),
  avgRating: spark([4.18, 4.20, 4.19, 4.22, 4.21, 4.23, 4.21]),
  positiveSentiment: spark([61.8, 62.2, 61.9, 62.5, 62.1, 62.8, 62.4]),
  neutralSentiment: spark([21.4, 21.1, 21.3, 20.9, 21.2, 21.0, 21.1]),
  negativeSentiment: spark([16.8, 16.7, 16.8, 16.6, 16.7, 16.2, 16.5]),
  activeComplaints: spark([298, 312, 318, 329, 334, 338, 342]),
}
