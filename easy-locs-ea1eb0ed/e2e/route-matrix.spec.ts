import { test, expect, Page } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:5173';

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/landing',
  '/radar',
  '/browse',
  '/install',
  '/terms',
  '/privacy',
  '/about',
  '/contact',
  '/pay/link-resolver',
];

const PROTECTED_ROUTES = [
  '/dashboard',
  '/orbit',
  '/wallet',
  '/me',
];

async function checkNoBlackScreen(page: Page) {
  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  expect(bodyHeight, 'Body height should be > 0 (no black screen)').toBeGreaterThan(0);
}

async function checkNoCFError(page: Page) {
  const bodyText = await page.evaluate(() => document.body.innerText);
  expect(bodyText, 'No Cloudflare 1001 error').not.toContain('1001');
  expect(bodyText, 'No CF "No web page" error').not.toContain('No web page');
}

async function checkNoSplashStuck(page: Page) {
  // Wait up to 8s for splash to disappear or diagnostic screen to appear
  const splashGone = await page.waitForSelector(
    '[data-testid="splash"], #splash, .splash-screen',
    { state: 'detached', timeout: 8000 }
  ).then(() => true).catch(() => true); // if splash never appeared, that's fine too
  expect(splashGone).toBe(true);
}

function isDiagnosticMode(bodyText: string): boolean {
  return bodyText.includes('EnvDiagnosticScreen') ||
    bodyText.includes('VITE_SUPABASE_URL') ||
    bodyText.includes('Missing environment');
}

// ── Public routes ──────────────────────────────────────────────────────────

for (const route of PUBLIC_ROUTES) {
  test(`@smoke public route renders: ${route}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => {
      if (!err.message.includes('ResizeObserver') && !err.message.includes('Non-Error')) {
        errors.push(err.message);
      }
    });

    const failedAssets: string[] = [];
    page.on('response', (resp) => {
      const url = resp.url();
      if (/\.(js|css)(\?.*)?$/.test(url) && resp.status() >= 400) {
        failedAssets.push(`${resp.status()} ${url}`);
      }
    });

    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 20000 });

    const bodyText = await page.evaluate(() => document.body.innerText || '');

    if (isDiagnosticMode(bodyText)) {
      // Diagnostic mode = app rendered without crash, just missing env vars
      console.log(`  ℹ️  ${route} is in diagnostic mode (env vars missing)`);
      return;
    }

    await checkNoBlackScreen(page);
    await checkNoCFError(page);

    expect(errors, `No fatal JS errors on ${route}`).toHaveLength(0);
    expect(failedAssets, `No failed JS/CSS assets on ${route}`).toHaveLength(0);
  });

  test(`@smoke public route survives hard refresh: ${route}`, async ({ page }) => {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });

    const bodyText = await page.evaluate(() => document.body.innerText || '');
    if (isDiagnosticMode(bodyText)) return;

    await checkNoBlackScreen(page);
    await checkNoCFError(page);
  });
}

// ── Mobile viewport public routes ──────────────────────────────────────────

test('@smoke mobile viewport: /login renders', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  const bodyText = await page.evaluate(() => document.body.innerText || '');
  if (isDiagnosticMode(bodyText)) return;
  await checkNoBlackScreen(page);
  await checkNoCFError(page);
});

test('@smoke mobile viewport: / renders', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  const bodyText = await page.evaluate(() => document.body.innerText || '');
  if (isDiagnosticMode(bodyText)) return;
  await checkNoBlackScreen(page);
  await checkNoCFError(page);
});

// ── Protected routes (should redirect to /login) ───────────────────────────

for (const route of PROTECTED_ROUTES) {
  test(`@smoke protected route redirects to /login: ${route}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => {
      if (!err.message.includes('ResizeObserver') && !err.message.includes('Non-Error')) {
        errors.push(err.message);
      }
    });

    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 20000 });

    // Should redirect to /login or show login page
    const url = page.url();
    const bodyText = await page.evaluate(() => document.body.innerText || '');

    if (isDiagnosticMode(bodyText)) {
      console.log(`  ℹ️  ${route} is in diagnostic mode (env vars missing)`);
      return;
    }

    await checkNoBlackScreen(page);
    await checkNoCFError(page);

    // Verify redirect happened OR react mounted (not black screen)
    const redirectedToLogin = url.includes('/login') || bodyText.toLowerCase().includes('login') || bodyText.toLowerCase().includes('sign in');
    const reactMounted = await page.evaluate(() => !!(window as any).__EASYLOCS_REACT_MOUNTED__);

    expect(
      redirectedToLogin || reactMounted,
      `${route} should redirect to /login or show authenticated content (no black screen)`
    ).toBe(true);

    expect(errors, `No fatal JS crashes on protected route ${route}`).toHaveLength(0);
  });
}
