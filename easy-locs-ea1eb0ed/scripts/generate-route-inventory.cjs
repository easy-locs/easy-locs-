#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const ROUTES_DIR = path.join(ROOT, 'src', 'routes');
const OUT_DIR = path.join(ROOT, 'docs', 'runtime');

fs.mkdirSync(OUT_DIR, { recursive: true });

const DOMAIN_MAP = {
  'auth.routes.tsx': 'auth',
  'dashboard.routes.tsx': 'dashboard',
  'radar.routes.tsx': 'radar',
  'orbit.routes.tsx': 'orbit',
  'wallet.routes.tsx': 'wallet',
  'me.routes.tsx': 'me',
  'merchant.routes.tsx': 'merchant',
  'driver.routes.tsx': 'driver',
  'pro.routes.tsx': 'pro',
  'admin.routes.tsx': 'admin',
  'onboarding.routes.tsx': 'onboarding',
  'deeplinks.routes.tsx': 'deeplinks',
  'seo.routes.tsx': 'seo',
  'legal.routes.tsx': 'legal',
};

function extractRoutes(file, domain) {
  const src = fs.readFileSync(file, 'utf8');
  const routes = [];

  // Match <Route path="..." element={...} />  (with potential multiline)
  const routeRe = /<Route\s[^>]*path="([^"]+)"[^>]*>/g;
  let m;
  while ((m = routeRe.exec(src)) !== null) {
    const routePath = m[1];
    const matchStart = m.index;

    // Look ahead ~600 chars for context
    const ctx = src.slice(matchStart, matchStart + 600);

    const isProtected = ctx.includes('<ProtectedRoute') || ctx.includes('ProtectedRoute>');
    const isSuperAdmin = ctx.includes('SuperAdminGate');
    const isNavigate = ctx.includes('<Navigate ');

    let redirectTo = null;
    if (isNavigate) {
      const navM = /to="([^"]+)"/.exec(ctx);
      if (navM) redirectTo = navM[1];
    }

    // Extract component name from element={...}
    let component = null;
    const elemM = /element=\{[^}]*<([A-Z][A-Za-z0-9]*)/.exec(ctx);
    if (elemM) component = elemM[1];
    if (!component && isNavigate) component = 'Navigate';

    let authLevel = 'public';
    if (isSuperAdmin) authLevel = 'super-admin';
    else if (domain === 'admin' && isProtected) authLevel = 'admin';
    else if (isProtected) authLevel = 'protected';

    routes.push({
      path: routePath,
      domain,
      protected: isProtected,
      authLevel,
      component: component || null,
      redirectTo,
    });
  }
  return routes;
}

const allRoutes = [];
const routeFiles = fs.readdirSync(ROUTES_DIR).filter(f => f.endsWith('.routes.tsx'));
for (const file of routeFiles) {
  const domain = DOMAIN_MAP[file] || file.replace('.routes.tsx', '');
  const routes = extractRoutes(path.join(ROUTES_DIR, file), domain);
  allRoutes.push(...routes);
}

// Write JSON
fs.writeFileSync(
  path.join(OUT_DIR, 'ROUTE_INVENTORY.json'),
  JSON.stringify(allRoutes, null, 2) + '\n'
);

// Write Markdown table
const header = '| Path | Domain | Protected | AuthLevel | Component | RedirectTo |\n|------|--------|-----------|-----------|-----------|------------|';
const rows = allRoutes.map(r =>
  `| \`${r.path}\` | ${r.domain} | ${r.protected} | ${r.authLevel} | ${r.component || ''} | ${r.redirectTo || ''} |`
);
const md = `# Route Inventory\n\nGenerated: ${new Date().toISOString()}\n\nTotal routes: ${allRoutes.length}\n\n${header}\n${rows.join('\n')}\n`;
fs.writeFileSync(path.join(OUT_DIR, 'ROUTE_INVENTORY.md'), md);

console.log(`✅ Route inventory generated: ${allRoutes.length} routes`);
console.log(`   docs/runtime/ROUTE_INVENTORY.json`);
console.log(`   docs/runtime/ROUTE_INVENTORY.md`);
