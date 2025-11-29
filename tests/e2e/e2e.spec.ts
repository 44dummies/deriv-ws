import { test, expect } from '@playwright/test'

// Note: This test requires a real Deriv test account and valid tokens.
// Configure PLAYWRIGHT_BASE_URL to point at the running dev server (default http://localhost:3000)

test('connect, active symbols, subscribe ticks, propose, buy', async ({ page, request }) => {
  await page.goto('/')

  // Login step is manual - test assumes you're already authenticated or using a test token
  // Navigate to dashboard
  await page.goto('/dashboard')
  await expect(page.locator('text=Dashboard')).toBeVisible()

  // Subscribe to ticks via the TickWatcher component
  const symbolSelect = page.locator('select')
  await symbolSelect.waitFor()
  // Pick first non-empty option
  const optionValue = await symbolSelect.locator('option:not([value=""])').first().getAttribute('value')
  if (optionValue) {
    await symbolSelect.selectOption(optionValue)
    await page.locator('button:has-text("Subscribe")').click()
    // wait a bit for ticks
    await page.waitForTimeout(2000)
  }

  // Use TradePanel to send a sample proposal
  await page.locator('input[placeholder="Symbol"]').first().fill('R_100')
  // Fallback: use the first symbol select for proposal if inputs absent
  await page.click('button:has-text("Send Proposal")')
  await page.waitForTimeout(2000)

  // If proposal_id is filled in, attempt buy
  const proposalField = page.locator('input[name="proposal_id"]')
  if (await proposalField.count() > 0) {
    const pid = await proposalField.inputValue()
    if (pid) {
      await page.click('button:has-text("Buy")')
      await page.waitForTimeout(2000)
    }
  }

  // Sanity: last response visible
  await expect(page.locator('text=Last Response').first()).toBeVisible()
})
