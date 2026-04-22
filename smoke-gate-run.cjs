const { chromium, firefox, webkit } = require('@playwright/test');

const BASE_URL = 'https://easy-locs.com';
const ROUTES = ['/', '/login', '/dashboard', '/orbit', '/wallet', '/radar', '/admin'];
const FATAL_PATTERNS = [/TypeError/i, /ReferenceError/i, /Uncaught /i];
const BOOT_ERROR_STRINGS = ['Taking too long? Reset & retry', 'Erreur de démarrage'];

const results = {};

async function smokeRoute(browserType, browserName, route) {
  const browser = await browserType.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ ignoreHTTPSErrors: false });
  const page = await context.newPage();

  const pageErrors = [];
  const fatalConsole = [];
  const failedAssets = [];
  const reactChunks = [];
  const forbiddenChunks = [];

  page.on('pageerror', (err) => {
    const msg = err.message || String(err);
    if (
      msg.includes('ResizeObserver loop') ||
      msg.includes('Non-Error promise rejection') ||
      msg.includes('Script error.')
    ) return;
    pageErrors.push(msg);
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (FATAL_PATTERNS.some(p => p.test(text))) {
        fatalConsole.push(text);
      }
    }
  });

  page.on('requestfailed', (req) => {
    const url = req.url();
    if (/\.(js|css)(\?|$)/.test(url)) {
      failedAssets.push(`${req.failure()?.errorText} — ${url}`);
    }
  });

  page.on('response', (res) => {
    const url = res.url();
    const bn = (url.split('/').pop() || '').split('?')[0];
    // vendor-react present (but NOT vendor-react-dom, vendor-react-core, vendor-react-router)
    if (/^vendor-react(-[A-Za-z0-9]{8,})?\.js$/.test(bn)) {
      reactChunks.push(bn);
    }
    if (/^vendor-react-(dom|core)(-[A-Za-z0-9]{8,})?\.js$/.test(bn)) {
      forbiddenChunks.push(bn);
    }
  });

  let httpStatus = 0;
  let navError = null;
  try {
    const resp = await page.goto(BASE_URL + route, { waitUntil: 'networkidle', timeout: 35000 });
    httpStatus = resp?.status() ?? 0;
  } catch (e) {
    navError = e.message;
  }

  await page.waitForTimeout(3000);

  const bodyHTML = await page.evaluate(() => document.body ? document.body.innerHTML : '').catch(() => '');
  const bodyText = await page.evaluate(() => document.body ? document.body.innerText : '').catch(() => '');
  const mounted = await page.evaluate(() => window.__EASYLOCS_REACT_MOUNTED__ === true).catch(() => false);
  const isBlank = !bodyHTML || bodyHTML.trim().length < 80 || /^<div id="root">\s*<\/div>$/.test(bodyHTML.trim());
  const bootErrors = BOOT_ERROR_STRINGS.filter(s => bodyText.includes(s));

  await browser.close();

  const PASS =
    !navError &&
    httpStatus < 400 &&
    pageErrors.length === 0 &&
    fatalConsole.length === 0 &&
    failedAssets.length === 0 &&
    bootErrors.length === 0 &&
    !isBlank &&
    reactChunks.length > 0 &&
    forbiddenChunks.length === 0;

  return {
    browserName, route, httpStatus, navError,
    pageErrors, fatalConsole, failedAssets, bootErrors,
    isBlank, mounted, reactChunks, forbiddenChunks,
    PASS,
  };
}

async function main() {
  const browsers = [
    [chromium, 'chromium'],
    [firefox, 'firefox'],
    [webkit, 'webkit'],
  ];

  for (const [bt, name] of browsers) {
    results[name] = {};
    for (const route of ROUTES) {
      process.stdout.write(`  [${name}] ${route} ... `);
      try {
        const r = await smokeRoute(bt, name, route);
        results[name][route] = r;
        console.log(r.PASS ? 'PASS' : `FAIL (HTTP ${r.httpStatus})`);
      } catch(e) {
        results[name][route] = { browserName: name, route, PASS: false, error: e.message };
        console.log(`ERROR: ${e.message}`);
      }
    }
  }

  console.log('\n========== SMOKE GATE DETAILED FAILURES ==========');
  let totalFail = 0;
  const firstBlocker = [];
  for (const [br, routes] of Object.entries(results)) {
    for (const [route, r] of Object.entries(routes)) {
      if (!r.PASS) {
        totalFail++;
        const lines = [`FAIL: [${br}] ${route} (HTTP ${r.httpStatus||'?'})`];
        if (r.error) lines.push(`  error: ${r.error}`);
        if (r.navError) lines.push(`  navError: ${r.navError}`);
        if (r.pageErrors?.length) lines.push(`  pageerrors: ${r.pageErrors.slice(0,3).join(' | ')}`);
        if (r.fatalConsole?.length) lines.push(`  fatalConsole: ${r.fatalConsole.slice(0,3).join(' | ')}`);
        if (r.failedAssets?.length) lines.push(`  failedAssets: ${r.failedAssets.slice(0,5).join('\n    ')}`);
        if (r.bootErrors?.length) lines.push(`  bootErrors: ${r.bootErrors.join(' | ')}`);
        if (r.isBlank) lines.push(`  blank screen: YES`);
        if (!r.reactChunks?.length) lines.push(`  vendor-react chunk: ABSENT`);
        if (r.forbiddenChunks?.length) lines.push(`  forbidden chunks: ${r.forbiddenChunks.join(', ')}`);
        lines.push(`  __EASYLOCS_REACT_MOUNTED__: ${r.mounted}`);
        console.log(lines.join('\n'));
        if (firstBlocker.length === 0) firstBlocker.push(...lines);
      }
    }
  }
  if (totalFail === 0) console.log('  (none — all routes passed on all browsers)');

  console.log('\n--- Browser × Route Matrix ---');
  const brs = Object.keys(results);
  process.stdout.write('route         ');
  for (const br of brs) process.stdout.write(br.padEnd(14));
  console.log();
  for (const route of ROUTES) {
    process.stdout.write(route.padEnd(14));
    for (const br of brs) {
      const r = results[br]?.[route];
      const cell = r?.PASS ? 'PASS' : `FAIL(${r?.httpStatus??'?'})`;
      process.stdout.write(cell.padEnd(14));
    }
    console.log();
  }

  console.log(`\nTotal test points: ${brs.length * ROUTES.length}`);
  console.log(`Failures: ${totalFail}`);
  
  if (firstBlocker.length) {
    console.log('\nFirst blocker:');
    console.log(firstBlocker.join('\n'));
  }

  const verdict = totalFail === 0 ? 'SAFE_TO_MERGE' : 'DO_NOT_MERGE';
  console.log('\nFINAL VERDICT: ' + verdict);
}

main().catch(e => { console.error('GATE ERROR:', e); process.exit(1); });
