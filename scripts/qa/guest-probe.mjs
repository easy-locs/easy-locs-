#!/usr/bin/env node
/**
 * Guest-mode probe: walks the app's public surfaces with Playwright and
 * records console errors, page errors, and HTTP failures (status >=400).
 * Output: test-results/guest-probe.json — consumed by build-report.mjs.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:5000';
const EXEC = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;

const ROUTES = [
  '/', '/login', '/dashboard', '/wallet', '/orders', '/notifications',
  '/radar', '/me', '/marketplace', '/explore', '/properties', '/orbit',
  '/settings', '/notifications', '/install', '/admin', '/non-existent-route-xyz',
];

const findings = [];

const browser = await chromium.launch({
  headless: true,
  ...(EXEC ? { executablePath: EXEC } : {}),
});

for (const route of ROUTES) {
  const consoleErrors = [];
  const pageErrors = [];
  const httpErrors = [];
  let context, page;
  const t0 = Date.now();
  let navStatus = 'ok';
  try {
    context = await browser.newContext();
    page = await context.newPage();
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => pageErrors.push(String(e?.message || e)));
    page.on('response', (r) => { const s = r.status(); if (s >= 400) httpErrors.push(`${s} ${r.request().method()} ${r.url()}`); });
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 12_000 });
    } catch (e) {
      navStatus = `nav-error: ${(e?.message || e).toString().split('\n')[0]}`;
    }
    try { await page.waitForTimeout(400); } catch { /* page closed */ }
  } catch (e) {
    navStatus = `context-error: ${(e?.message || e).toString().split('\n')[0]}`;
  } finally {
    try { await context?.close(); } catch { /* ignore */ }
  }
  const durationMs = Date.now() - t0;

  findings.push({
    route,
    durationMs,
    navStatus,
    consoleErrors: dedupe(consoleErrors).slice(0, 8),
    pageErrors: dedupe(pageErrors).slice(0, 8),
    httpErrors: dedupe(httpErrors).slice(0, 12),
  });
  // eslint-disable-next-line no-console
  console.log(`${route}\t${durationMs}ms\tconsole=${consoleErrors.length}\tpage=${pageErrors.length}\thttp4xx5xx=${httpErrors.length}`);
}

await browser.close();
mkdirSync('test-results', { recursive: true });
writeFileSync('test-results/guest-probe.json', JSON.stringify({ baseUrl: BASE, findings }, null, 2));
// eslint-disable-next-line no-console
console.log(`wrote test-results/guest-probe.json (${findings.length} routes)`);

function dedupe(arr) {
  const seen = new Set();
  const out = [];
  for (const v of arr) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}
