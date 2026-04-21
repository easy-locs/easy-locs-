/**
 * Easy-Locs BOOT GATE — Playwright audit script
 * Runs against http://localhost:4173
 * Tests routes: /, /login, /dashboard, /orbit, /wallet, /radar, /admin
 */
import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:4173';
const ROUTES = ['/', '/login', '/dashboard', '/orbit', '/wallet', '/radar', '/admin'];
const SPLASH_TIMEOUT_MS = 10_000;

// Fail conditions
const FAIL_PATTERNS = [
  /Taking too long\? Reset/i,
  /Erreur de démarrage/i,
  /Boot Error/i,
];

async function auditRoute(page, route) {
  const url = BASE_URL + route;
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    pageErrors.push(err.message);
  });
  page.on('requestfailed', req => {
    failedRequests.push({ url: req.url(), failure: req.failure()?.errorText });
  });

  const start = Date.now();
  let navigationOk = false;
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    navigationOk = true;
    const status = response?.status() || 0;
    if (status >= 400) {
      return { route, status, error: `HTTP ${status}`, severity: 'BOOT_BLOCKER', consoleErrors, pageErrors, failedRequests };
    }
  } catch (err) {
    return { route, error: `Navigation failed: ${err.message}`, severity: 'BOOT_BLOCKER', consoleErrors, pageErrors, failedRequests };
  }

  // Wait for React to mount or splash to disappear (up to SPLASH_TIMEOUT_MS)
  let splashGone = false;
  let reactMounted = false;
  let visibleText = '';
  
  try {
    // Check if splash exists and wait for it to disappear
    await page.waitForFunction(() => {
      const splash = document.getElementById('app-loading');
      const root = document.getElementById('root');
      const mounted = !!(window.__EASYLOCS_REACT_MOUNTED__) || !!(window.__EASYLOCS_BOOTED__);
      const hasSplash = !!splash;
      const rootHasContent = root && root.children.length > 0;
      return !hasSplash || mounted || rootHasContent;
    }, { timeout: SPLASH_TIMEOUT_MS });
    splashGone = true;
  } catch (e) {
    // Timeout - splash still showing
  }

  // Wait for React to fully mount (useEffect fires after first commit, then
  // stage-2/3 lazy chunks resolve). 3s is generous but reliable.
  await page.waitForTimeout(3000);

  try {
    reactMounted = await page.evaluate(() => {
      return !!(window.__EASYLOCS_REACT_MOUNTED__) || !!(window.__EASYLOCS_BOOTED__);
    });
  } catch {}

  try {
    visibleText = await page.evaluate(() => document.body?.innerText?.slice(0, 500) || '');
  } catch {}

  const elapsed = Date.now() - start;

  // Check for fail patterns in visible text
  for (const pattern of FAIL_PATTERNS) {
    if (pattern.test(visibleText)) {
      return {
        route,
        severity: 'BOOT_BLOCKER',
        error: `Fail pattern matched: ${pattern}`,
        elapsed,
        splashGone,
        reactMounted,
        visibleText: visibleText.slice(0, 300),
        consoleErrors,
        pageErrors,
        failedRequests,
      };
    }
  }

  // Check for blank screen
  const rootChildCount = await page.evaluate(() => {
    const root = document.getElementById('root');
    return root ? root.children.length : -1;
  }).catch(() => -1);

  if (rootChildCount === 0) {
    return {
      route,
      severity: 'BOOT_BLOCKER',
      error: 'Blank screen — #root has no children after 10s',
      elapsed,
      splashGone,
      reactMounted,
      visibleText: visibleText.slice(0, 300),
      consoleErrors,
      pageErrors,
      failedRequests,
    };
  }

  // Check for stuck splash
  if (!splashGone) {
    return {
      route,
      severity: 'BOOT_BLOCKER',
      error: `Splash stuck beyond ${SPLASH_TIMEOUT_MS}ms`,
      elapsed,
      splashGone,
      reactMounted,
      visibleText: visibleText.slice(0, 300),
      consoleErrors,
      pageErrors,
      failedRequests,
    };
  }

  // Classify fatal console errors — exclude Supabase-not-configured (env issue, not code bug)
  const fatalErrors = consoleErrors.filter(e =>
    /BOOT_CRASH|BOOT_STUCK|ChunkLoadError|SyntaxError|TypeError.*undefined|Cannot read/i.test(e) &&
    !/supabase.*client.*not configured|SUPABASE_URL.*missing|SUPABASE_PUBLISHABLE_KEY.*missing/i.test(e)
  );

  // Exclude Supabase-not-configured pageerrors — env issue in local build
  const realPageErrors = pageErrors.filter(e =>
    !/supabase.*client.*not configured|SUPABASE_URL.*missing|SUPABASE_PUBLISHABLE_KEY.*missing/i.test(e)
  );

  // Check failed JS/CSS assets
  const assetFailures = failedRequests.filter(r =>
    /\.js$|\.css$|\.mjs$/.test(r.url)
  );

  const severity = fatalErrors.length > 0 ? 'BOOT_BLOCKER' :
                   realPageErrors.length > 0 ? 'BOOT_BLOCKER' :
                   assetFailures.length > 0 ? 'NETWORK_FAILURE' :
                   'PASS';

  return {
    route,
    severity,
    elapsed,
    splashGone,
    reactMounted,
    visibleText: visibleText.slice(0, 300),
    consoleErrors,
    pageErrors,
    failedRequests: failedRequests.slice(0, 10),
    fatalErrors,
    realPageErrors,
    assetFailures,
  };
}

async function main() {
  console.log('=== EASY-LOCS BOOT GATE ===');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Browser: Chromium (Desktop)\n`);

  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const results = [];

  for (const route of ROUTES) {
    console.log(`\n--- Auditing ${route} ---`);
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    
    try {
      const result = await auditRoute(page, route);
      results.push(result);
      
      console.log(`  Severity: ${result.severity}`);
      if (result.error) console.log(`  Error: ${result.error}`);
      console.log(`  Splash gone: ${result.splashGone}`);
      console.log(`  React mounted: ${result.reactMounted}`);
      if (result.consoleErrors?.length) console.log(`  Console errors: ${result.consoleErrors.length}`);
      if (result.pageErrors?.length) console.log(`  Page errors: ${result.pageErrors.length}`);
      if (result.failedRequests?.length) console.log(`  Failed requests: ${result.failedRequests.length}`);
      if (result.visibleText) console.log(`  Visible text: ${result.visibleText.slice(0, 100)}`);
      
      // Take screenshot
      const screenshotPath = `/tmp/boot-gate${route.replace(/\//g, '-') || '-root'}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`  Screenshot: ${screenshotPath}`);
    } catch (err) {
      console.error(`  FATAL: ${err.message}`);
      results.push({ route, severity: 'BOOT_BLOCKER', error: err.message });
    } finally {
      await context.close();
    }

    // Stop at first BOOT_BLOCKER
    if (results[results.length - 1].severity === 'BOOT_BLOCKER') {
      console.log(`\n🚨 BOOT_BLOCKER found at ${route} — stopping audit`);
      break;
    }
  }

  await browser.close();

  console.log('\n=== SUMMARY ===');
  for (const r of results) {
    console.log(`  ${r.severity === 'PASS' ? '✅' : '🚨'} ${r.route}: ${r.severity}${r.error ? ' — ' + r.error : ''}`);
  }

  const firstBlocker = results.find(r => r.severity !== 'PASS');
  if (firstBlocker) {
    console.log(`\nFIRST BLOCKER: ${firstBlocker.route} — ${firstBlocker.severity}`);
    if (firstBlocker.consoleErrors?.length) {
      console.log('Console errors:');
      firstBlocker.consoleErrors.forEach(e => console.log('  ' + e));
    }
    if (firstBlocker.pageErrors?.length) {
      console.log('Page errors:');
      firstBlocker.pageErrors.forEach(e => console.log('  ' + e));
    }
    if (firstBlocker.failedRequests?.length) {
      console.log('Failed requests:');
      firstBlocker.failedRequests.forEach(r => console.log(`  ${r.url} — ${r.failure}`));
    }
    console.log('\nVERDICT: NEED_NEXT_FIX');
  } else {
    console.log('\nVERDICT: SAFE_TO_CONTINUE');
  }

  return results;
}

main().catch(err => {
  console.error('Boot gate failed:', err);
  process.exit(1);
});
