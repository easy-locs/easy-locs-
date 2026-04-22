import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:5173';

function isDiagnosticMode(bodyText: string): boolean {
  return bodyText.includes('EnvDiagnosticScreen') ||
    bodyText.includes('VITE_SUPABASE_URL') ||
    bodyText.includes('Missing environment');
}

test('@flow @smoke homepage loads content', async ({ page }) => {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });

  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  expect(bodyHeight, 'Homepage body height > 0').toBeGreaterThan(0);

  const bodyText = await page.evaluate(() => document.body.innerText || '');
  if (isDiagnosticMode(bodyText)) {
    console.log('ℹ️  Homepage in diagnostic mode (env vars missing)');
    return;
  }

  // Should not show Cloudflare error pages
  expect(bodyText).not.toContain('1001');
  expect(bodyText).not.toContain('No web page');
});

test('@flow @smoke login page renders without crash', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => {
    if (!err.message.includes('ResizeObserver') && !err.message.includes('Non-Error')) {
      errors.push(err.message);
    }
  });

  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 20000 });

  const bodyText = await page.evaluate(() => document.body.innerText || '');
  if (isDiagnosticMode(bodyText)) {
    console.log('ℹ️  Login page in diagnostic mode (env vars missing)');
    return;
  }

  // Try filling email/password with dummy values (no crash expected)
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();

  if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await emailInput.fill('test@example.com');
  }
  if (await passwordInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await passwordInput.fill('dummypassword123');
  }

  // Verify page didn't crash
  expect(errors, 'No fatal JS errors on /login').toHaveLength(0);

  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  expect(bodyHeight, 'Login page body height > 0').toBeGreaterThan(0);
});

test('@flow @smoke radar page loads map or content', async ({ page }) => {
  await page.goto(`${BASE}/radar`, { waitUntil: 'domcontentloaded', timeout: 20000 });

  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  expect(bodyHeight, 'Radar page body height > 0').toBeGreaterThan(0);

  const bodyText = await page.evaluate(() => document.body.innerText || '');
  if (isDiagnosticMode(bodyText)) {
    console.log('ℹ️  Radar page in diagnostic mode (env vars missing)');
    return;
  }

  expect(bodyText).not.toContain('1001');
  expect(bodyText).not.toContain('No web page');
});
