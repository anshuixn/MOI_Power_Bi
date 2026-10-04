import { expect, test } from '@playwright/test'

const routes = [
  { path: '/', heading: /Understand\s*Every Customer\.\s*Instantly\./ },
  { path: '/dashboard', heading: 'Good Morning' },
  { path: '/reviews', heading: 'Reviews' },
  { path: '/analytics', heading: 'Analytics' },
  { path: '/topics', heading: 'Topic Intelligence' },
  { path: '/complaints', heading: 'Complaints & Issues' },
  { path: '/ai-insights', heading: 'AI Insights' },
  { path: '/model-health', heading: 'Model Health' },
  { path: '/reports', heading: 'Reports' },
  { path: '/settings', heading: 'Settings' },
]

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.clear()
    localStorage.clear()
  })
})

for (const route of routes) {
  test(`direct route and metadata: ${route.path}`, async ({ page }) => {
    await page.goto(route.path)
    await expect(page.locator('main h1').first()).toContainText(route.heading)
    await expect.poll(() => page.title()).not.toBe('')
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${route.path.replace('/', '\\/')}$`))
  })
}

for (const route of routes) {
  test(`responsive overflow check: ${route.path}`, async ({ page }) => {
    test.setTimeout(60_000)
    await page.goto(route.path)
    await expect(page.locator('main h1').first()).toContainText(route.heading)
    for (const width of [375, 390, 414, 768, 1024, 1280, 1440, 1920, 2560, 3440]) {
      await page.setViewportSize({ width, height: 900 })
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, `${route.path} at ${width}px`).toBe(0)
    }
  })
}

test('command palette navigates to a route by keyboard', async ({ page }) => {
  await page.goto('/dashboard')
  await page.keyboard.press('Control+k')
  const palette = page.getByRole('dialog', { name: 'Search pages, products, and topics' })
  await expect(palette).toBeVisible()
  const search = palette.getByRole('textbox', { name: 'Search pages, products, and topics' })
  await search.fill('Reviews Explorer')
  await expect(palette.getByRole('option', { name: /Reviews Explorer/ }))
    .toHaveAttribute('aria-selected', 'true')
  await search.press('Enter')
  await expect(page).toHaveURL(/\/reviews$/)
  await expect(page.locator('main h1')).toContainText('Reviews')
})

test('desktop sidebar handle reveals dashboard navigation on hover', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/dashboard')

  const trigger = page.getByTestId('sidebar-menu-trigger')
  await expect(trigger).toBeVisible()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await trigger.hover()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  const sidebar = page.locator('#reviewband-sidebar')
  await expect.poll(() => sidebar.evaluate(element =>
    Math.round(element.getBoundingClientRect().left)
  )).toBe(0)
  await expect(sidebar.getByRole('link', { name: 'Dashboard' })).toBeInViewport()
})

test('landing CTAs stay visible and lead to the demo and workspace', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const enterWorkspace = page.locator('#landing-enter-btn')
  const watchDemo = page.locator('#landing-demo-btn')
  await expect(enterWorkspace).toBeVisible()
  await expect(watchDemo).toBeVisible()

  await watchDemo.click()
  await expect(page.getByRole('heading', { name: 'Customer voices' })).toBeInViewport()

  await page.goto('/')
  await page.locator('#landing-enter-btn').click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.locator('main h1')).toContainText('Good Morning')
})

test('landing scene survives cursor and reverse-scroll interaction; cards stay stable on hover', async ({ page }) => {
  test.setTimeout(60_000)
  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  page.on('pageerror', error => pageErrors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  const sceneCanvas = page.locator('canvas')
  await expect(sceneCanvas).toHaveCount(1)
  await expect.poll(async () => Math.round((await sceneCanvas.boundingBox())?.height ?? 0))
    .toBe(900)

  await page.mouse.move(1200, 240)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  await expect.poll(async () => Math.round((await sceneCanvas.boundingBox())?.y ?? -1))
    .toBe(0)
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)

  const card = page.locator('.feat-card').first()
  await card.scrollIntoViewIfNeeded()
  await expect(card).toHaveCSS('opacity', '1')
  const bounds = await card.boundingBox()
  if (!bounds) throw new Error('The first landing feature card has no visible bounds')
  const cardTransform = await card.evaluate(element => getComputedStyle(element).transform)
  await card.hover({ position: { x: bounds.width * 0.85, y: bounds.height * 0.2 } })
  await expect(card).toHaveCSS('transform', cardTransform)
  await page.mouse.move(10, 10)
  await expect(card).toHaveCSS('transform', cardTransform)
  await page.waitForTimeout(250)
  expect(await card.boundingBox()).toEqual(bounds)

  const enterWorkspace = page.locator('#landing-enter-btn')
  await enterWorkspace.hover()
  await expect(enterWorkspace).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -3)')
  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
})

test('feature cards slide in sequentially, settle, and reverse smoothly', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  const cards = page.locator('.feat-card-path')
  await expect(cards).toHaveCount(6)

  const start = await cards.first().evaluate(element => {
    const gridTop = window.scrollY + (element.parentElement?.getBoundingClientRect().top ?? 0)
    return gridTop - window.innerHeight * 0.9
  })
  const readCardState = () => cards.evaluateAll(elements => elements.map(element => {
    const style = getComputedStyle(element)
    const matrix = new DOMMatrixReadOnly(style.transform)
    return {
      opacity: Number(style.opacity),
      x: matrix.m41,
      y: matrix.m42,
      z: matrix.m43,
      scale: matrix.a,
    }
  }))
  const readCardPositions = () => cards.evaluateAll(elements => elements.map(element => {
    const { x, y, width, height } = element.getBoundingClientRect()
    return { x, y: y + window.scrollY, width, height }
  }))
  const readAnimationSpan = () => page.evaluate(() => window.innerHeight * 0.6)

  await page.evaluate(top => window.scrollTo({ top, behavior: 'instant' }), start - 2)
  await expect.poll(() => cards.first().evaluate(element =>
    Number(getComputedStyle(element).opacity)
  )).toBe(0)

  const animationSpan = await readAnimationSpan()
  await page.evaluate(top => window.scrollTo({ top, behavior: 'instant' }), start + animationSpan * 0.45)
  let staggeredStates: Awaited<ReturnType<typeof readCardState>> = []
  await expect.poll(async () => {
    const states = await readCardState()
    const hasStaggeredPositions = Math.abs(states[0].x) < 1 && Math.abs(states[0].y) < 1
      && Math.abs(states[5].x) + Math.abs(states[5].y) > 1
    if (hasStaggeredPositions) staggeredStates = states
    return hasStaggeredPositions
  }).toBe(true)
  expect(staggeredStates).toHaveLength(6)
  expect(staggeredStates[0].z === 0 && Math.abs(staggeredStates[0].scale - 1) < 0.001).toBe(true)

  await page.evaluate(top => window.scrollTo({ top, behavior: 'instant' }), start + animationSpan + 2)
  await expect.poll(async () => {
    const states = await readCardState()
    return states.every(state => state.opacity === 1 && Math.abs(state.x) < 1 && Math.abs(state.y) < 1)
  }).toBe(true)
  const finalBoxes = await readCardPositions()

  await page.evaluate(top => window.scrollTo({ top, behavior: 'instant' }), start + animationSpan + 120)
  await page.waitForTimeout(250)
  expect((await readCardState()).every(state =>
    state.opacity === 1 && state.x === 0 && state.y === 0
      && state.z === 0 && Math.abs(state.scale - 1) < 0.001
  )).toBe(true)
  expect(await readCardPositions()).toEqual(finalBoxes)

  await page.evaluate(top => window.scrollTo({ top, behavior: 'instant' }), start - 2)
  await expect.poll(async () => {
    const states = await readCardState()
    return states.every(state => state.opacity === 0 && Math.abs(state.x) + Math.abs(state.y) > 1)
  }).toBe(true)

  await page.evaluate(top => window.scrollTo({ top, behavior: 'instant' }), start + animationSpan + 2)
  await expect.poll(async () => {
    const states = await readCardState()
    return states.every(state => state.opacity === 1 && Math.abs(state.x) < 1 && Math.abs(state.y) < 1)
  }).toBe(true)

  await page.setViewportSize({ width: 390, height: 844 })
  const mobileStart = await cards.first().evaluate(element =>
    window.scrollY + (element.parentElement?.getBoundingClientRect().top ?? 0) - window.innerHeight * 0.9 + 2
  )
  const mobileAnimationSpan = await readAnimationSpan()
  await page.evaluate(top => window.scrollTo({ top, behavior: 'instant' }), mobileStart + mobileAnimationSpan + 2)
  await expect.poll(async () => {
    const states = await readCardState()
    return states.every(state => state.opacity === 1 && Math.abs(state.x) < 1 && Math.abs(state.y) < 1)
  }).toBe(true)
  expect(await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )).toBe(0)
})

test('feature cards remain settled when reduced motion is enabled', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const cards = page.locator('.feat-card-path')
  await expect(cards).toHaveCount(6)
  await expect.poll(() => cards.evaluateAll(elements => elements.every(element =>
    getComputedStyle(element).opacity === '1'
  ))).toBe(true)

  const start = await cards.first().evaluate(element =>
    window.scrollY + (element.parentElement?.getBoundingClientRect().top ?? 0) - window.innerHeight * 0.9
  )
  await page.evaluate(top => window.scrollTo({ top, behavior: 'instant' }), start + 400)
  const states = await cards.evaluateAll(elements => elements.map(element => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform)
    return { x: matrix.m41, y: matrix.m42, z: matrix.m43 }
  }))
  expect(states.every(state => state.x === 0 && state.y === 0 && state.z === 0)).toBe(true)
  expect(await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )).toBe(0)
})

test('review search and detail drawer', async ({ page }) => {
  await page.goto('/reviews')
  const search = page.getByPlaceholder('Search reviews, products, or keywords...')
  await search.fill('Aero Blender')
  const matchingReview = page.getByText('Aero Blender', { exact: true }).first()
  await expect(matchingReview).toBeVisible({ timeout: 15_000 })
  await matchingReview.click()
  await expect(page.getByText('Review Details')).toBeVisible()
})

test('topic and complaint detail drawers open', async ({ page }) => {
  await page.goto('/topics')
  await page.getByText('Product Quality', { exact: true }).first().click()
  await expect(page.getByText('Sentiment Breakdown')).toBeVisible()

  await page.goto('/complaints')
  await page.getByText('Late Delivery', { exact: true }).first().click()
  await expect(page.getByText('Current Status')).toBeVisible()
})

test('date range custom selection and insight regeneration', async ({ page }) => {
  await page.goto('/dashboard')
  await page.getByRole('button', { name: 'Date range: Last 30 Days' }).click()
  await page.getByRole('button', { name: 'Custom Range' }).click()
  await page.getByLabel('Start date').fill('2024-11-01')
  await page.getByLabel('End date').fill('2024-11-14')
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect(page.getByRole('button', { name: 'Date range: Custom Range' })).toBeVisible()

  await page.goto('/ai-insights')
  await page.getByRole('button', { name: 'Regenerate' }).click()
  await expect(page.getByRole('button', { name: 'Regenerate' })).toBeEnabled()
})

test('product and source filters update their selected values', async ({ page }) => {
  await page.goto('/dashboard')
  await page.getByRole('button', { name: 'All Products' }).click()
  await page.getByRole('option', { name: 'Aero Blender' }).click()
  await expect(page.getByRole('button', { name: 'Aero Blender' })).toBeVisible()

  await page.getByRole('button', { name: 'All Sources' }).click()
  await page.getByRole('option', { name: 'Web Store' }).click()
  await expect(page.getByRole('button', { name: 'Web Store' })).toBeVisible()
})

test('notifications and report generation', async ({ page }) => {
  await page.goto('/dashboard')
  await page.getByRole('button', { name: /Notifications/ }).click()
  const notifications = page.getByRole('dialog', { name: 'Notifications' })
  await expect(notifications).toBeVisible()
  await notifications.getByRole('button', { name: 'Mark all read' }).click()

  await page.goto('/reports')
  await page.getByRole('button', { name: 'Generate Report' }).first().click()
  await expect(page.getByRole('button', { name: 'Generated' }).first()).toBeVisible()
})

test('settings save and reduced motion preference', async ({ page }) => {
  await page.goto('/settings')
  const reduceMotion = page.getByRole('switch', { name: 'Reduce Motion' })
  await reduceMotion.click()
  await expect(reduceMotion).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('button', { name: 'Save Preferences' }).click()
  await expect(page.getByRole('button', { name: 'Saved!' })).toBeVisible()
})

test('static performance tier disables the dashboard WebGL canvas', async ({ page }) => {
  await page.goto('/settings')
  await page.getByLabel('Performance Tier').selectOption('static')
  await expect(page.getByLabel('Performance Tier')).toHaveValue('static')
  await expect.poll(() => page.evaluate(() =>
    JSON.parse(localStorage.getItem('rb-settings') ?? '{}').performanceTier
  )).toBe('static')
  await expect(page.locator('[aria-hidden="true"] canvas')).toHaveCount(0)
  await page.getByRole('link', { name: /Dashboard/ }).click()
  await expect(page.locator('main h1')).toContainText('Good Morning')
  await expect(page.locator('[aria-hidden="true"] canvas')).toHaveCount(0)
})

test('reduced motion preserves decorative WebGL and dashboard content', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/dashboard')
  await expect(page.locator('main h1')).toContainText('Good Morning')
  await expect(page.locator('[aria-hidden="true"] canvas')).toHaveCount(1)
  await expect(page.getByText('128,430', { exact: true }).first()).toBeVisible()
  await expect(page.locator('.dashboard-grid-charts').first()).toBeVisible()
})

test('Reduce Motion keeps the dashboard background and closed sidebar glass styling', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/dashboard')
  const sidebar = page.getByRole('complementary', { name: 'Main navigation' })
  await page.mouse.move(500, 500)
  await page.waitForTimeout(500)
  const normalStyles = await sidebar.evaluate(element => {
    const style = getComputedStyle(element)
    return {
      background: style.backgroundColor,
      backdropFilter: style.backdropFilter,
      borderRight: style.borderRight,
      boxShadow: style.boxShadow,
      opacity: style.opacity,
      transform: style.transform,
    }
  })
  await expect(page.locator('[aria-hidden="true"] canvas')).toHaveCount(1)

  await page.goto('/settings')
  await page.getByRole('switch', { name: 'Reduce Motion' }).click()
  await page.goto('/dashboard')
  await page.mouse.move(500, 500)
  await page.waitForTimeout(500)
  await expect(page.locator('[aria-hidden="true"] canvas')).toHaveCount(1)
  const reducedStyles = await sidebar.evaluate(element => {
    const style = getComputedStyle(element)
    return {
      background: style.backgroundColor,
      backdropFilter: style.backdropFilter,
      borderRight: style.borderRight,
      boxShadow: style.boxShadow,
      opacity: style.opacity,
      transform: style.transform,
    }
  })
  expect(reducedStyles).toEqual(normalStyles)
  await expect(page.getByTestId('sidebar-edge-trigger')).toBeVisible()
})

test('enabling Reduce Motion in settings keeps dashboard content visible', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/settings')
  const reduceMotion = page.getByRole('switch', { name: 'Reduce Motion' })
  if (await reduceMotion.getAttribute('aria-checked') !== 'true') {
    await reduceMotion.click()
  }
  await expect(reduceMotion).toHaveAttribute('aria-checked', 'true')

  const dashboardLink = page.getByRole('complementary', { name: 'Main navigation' })
    .getByRole('link', { name: 'Dashboard' })
  await dashboardLink.focus()
  await dashboardLink.click()
  const main = page.locator('main')
  await expect(main.locator('h1')).toContainText('Good Morning')
  await expect(page.getByText('128,430', { exact: true }).first()).toBeVisible()
  const chart = main.locator('.dashboard-grid-charts .glass-card').first()
  await expect(chart).toBeVisible()
  await expect(chart).toHaveCSS('opacity', '1')
  await expect(main).toHaveClass(/page-enter-static/)
})

test('dashboard remains usable when WebGL is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = function () {
      return null
    }
  })
  await page.goto('/dashboard')
  await expect(page.locator('main h1')).toContainText('Good Morning')
  await expect(page.locator('[aria-hidden="true"] canvas')).toHaveCount(0)
  await expect(page.getByText('128,430', { exact: true }).first()).toBeVisible()
})

test('desktop sidebar reveals from its edge trigger', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/dashboard')
  const sidebar = page.getByRole('complementary', { name: 'Main navigation' })
  await expect(sidebar).toBeVisible()
  await page.mouse.move(200, 450)
  await page.mouse.move(19, 450, { steps: 10 })
  await expect.poll(() =>
    sidebar.evaluate(element => new DOMMatrixReadOnly(getComputedStyle(element).transform).m41)
  ).toBeGreaterThan(-5)
  await sidebar.getByRole('link', { name: 'Reviews' }).hover()
  await expect(sidebar.getByRole('link', { name: 'Reviews' })).toBeVisible()
})

test('dashboard metrics match the specified sample-data baseline', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.getByText('128,430', { exact: true }).first()).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('main')).toContainText(/4\.21\s*\/\s*5/)
  await expect(page.locator('main')).toContainText('62.4%')
  await expect(page.locator('main')).toContainText('342')
})

test('model health displays model metrics on the intended percentage scale', async ({ page }) => {
  await page.goto('/model-health')
  await expect(page.getByText('94.3%', { exact: true })).toBeVisible()
  await expect(page.getByText('93.9%', { exact: true })).toBeVisible()
  await expect(page.getByText('92.6%', { exact: true })).toBeVisible()
  await expect(page.getByText('F1: 92.1%', { exact: true })).toBeVisible()
  await expect(page.locator('main')).not.toContainText('9430.0%')
})

test('AI insight cards remain visible with reduced motion enabled', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/ai-insights')
  const cards = page.locator('main .glass-card.interactive')
  await expect(cards.first()).toBeVisible()
  await expect(cards.first()).toHaveCSS('opacity', '1')
  await expect(cards).toHaveCount(6)
})

test('mobile navigation renders and supports keyboard activation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/dashboard')
  const navigation = page.getByRole('navigation', { name: 'Mobile navigation' })
  await expect(navigation).toBeVisible()
  await navigation.getByRole('link', { name: 'Reviews' }).focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/reviews$/)
  await navigation.getByRole('button', { name: 'More navigation' }).click()
  await page.getByRole('menuitem', { name: 'Settings' }).click()
  await expect(page).toHaveURL(/\/settings$/)
})
