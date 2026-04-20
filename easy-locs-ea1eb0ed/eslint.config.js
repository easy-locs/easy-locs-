import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import easylocs from "./tooling/eslint-plugin-easylocs/index.js";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "storybook-static",
      "node_modules",
      "playwright-report",
      "test-results",
      "**/*.timestamp-*.mjs",
      "vite.config.ts.timestamp-*.mjs",
    ],
  },
  // ── Sovereign Agent Control L6 (#809) ──────────────────────────────
  // All mutations must flow through `dispatchExecutionTask`. The three
  // rules below are fail-closed; exemptions live in
  // `.eslintrc.dispatch-allowlist.json` and require PR review.
  // See docs/architecture/dispatch-guard.md.
  {
    files: ["src/**/*.{ts,tsx}", "supabase/functions/**/*.ts"],
    plugins: { easylocs },
    rules: {
      "easylocs/require-dispatch-execution-task": "error",
      "easylocs/no-direct-postgrest-mutation": "error",
      "easylocs/no-direct-rpc-mutation": "error",
    },
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/rules-of-hooks": "off",
      "no-empty": "off",
      "no-misleading-character-class": "off",
      "prefer-const": "off",
      "no-useless-escape": "off",
      "no-control-regex": "off",
      "no-useless-catch": "off",
      "no-case-declarations": "off",
      "no-duplicate-imports": "warn",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    ignores: [
      "src/services/db.ts",
      "src/integrations/supabase/client.ts",
      // ── Canonical-DB migration backlog (task #895 wiring sweep) ──────
      // The following files import `@/integrations/supabase/client`
      // directly. They are flagged for migration to the `db` wrapper
      // under the identity unification task (#227) and edge function
      // consolidation (#226). Snapshot taken 2026-04-17.
      "src/components/admin/agents/AgentTriggerDialog.tsx",
      "src/components/admin/SearchSyncStatusWidget.tsx",
      "src/core/execution/idempotency-service.test.ts",
      "src/core/execution/idempotency-service.ts",
      "src/core/execution/lock-service.test.ts",
      "src/core/execution/lock-service.ts",
      "src/core/execution/task-dispatcher.ts",
      "src/hooks/useCacheMetrics.ts",
      "src/hooks/useKycGate.ts",
      "src/hooks/useMapErrorDashboard.ts",
      "src/hooks/useMasterAppBootstrap.ts",
      "src/hooks/useServerEvents.ts",
      "src/lib/admin/agents-repo.ts",
      "src/lib/ai/content-enrichment-client.ts",
      "src/lib/ai/rag-client.ts",
      "src/lib/ai/recommendations-client.ts",
      "src/lib/api-gateway/connectors/careem-connector.ts",
      "src/lib/api-gateway/connectors/deliveroo-connector.ts",
      "src/lib/api-gateway/connectors/talabat-connector.ts",
      "src/lib/command-control/email-parser.ts",
      "src/lib/geo/spatial-service.ts",
      "src/lib/infrastructure/cache-layer.ts",
      "src/lib/kyc/kyc-gate-service.ts",
      "src/lib/notifications/email-dispatcher.ts",
      "src/lib/onboarding/scraping/firecrawl-client.ts",
      "src/lib/utils/article-extractor.ts",
      "src/lib/wallet/wallet-identity-binding.ts",
      "src/pages/admin/AdminDldBackfillPage.tsx",
      "src/pages/admin/control/sections/ApprovalsSection.tsx",
      "src/pages/CommandCenter.tsx",
      "src/pages/DashboardCommandCenter.tsx",
      "src/repositories/domain/dashboard.repo.ts",
      "src/services/bnpl.service.ts",
      "src/services/command-center-client.ts",
      "src/services/e-signature.service.ts",
      "src/services/micro-insurance.service.ts",
      "src/services/plaid.service.ts",
      "src/services/social-graph.service.ts",
      "src/services/virtual-cards.service.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/integrations/supabase/client", "*/integrations/supabase/client"],
              message:
                "Direct Supabase client import is forbidden. Use `import { db } from '@/services/db'` instead.",
            },
            {
              group: ["@/components/layout/AppPageShell"],
              message:
                "AppPageShell is deprecated. Use `PageShell` from '@/components/ui/page-shell' instead.",
            },
            {
              group: ["@/components/layout/UniversePageShell"],
              message:
                "UniversePageShell is deprecated. Use `PageShell` from '@/components/ui/page-shell' instead.",
            },
            {
              group: ["@/components/layout/SEOPageShell"],
              message:
                "SEOPageShell is deprecated. Use `PageShell` from '@/components/ui/page-shell' instead.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    ignores: [
      "src/services/local-store.ts",
      "src/integrations/supabase/client.ts",
    ],
    rules: {
      "no-restricted-globals": [
        "warn",
        {
          name: "localStorage",
          message:
            "Direct localStorage access is discouraged. Use `localStore` from '@/services/local-store' with a pillar namespace instead.",
        },
        {
          name: "sessionStorage",
          message:
            "Direct sessionStorage access is discouraged. Use `sessionStore` from '@/services/local-store' with a pillar namespace instead.",
        },
      ],
    },
  },
  {
    files: [
      "src/pages/**/*.tsx",
      "src/components/dashboard/**/*.tsx",
      "src/components/wallet/**/*.tsx",
      "src/components/orbit/**/*.tsx",
      "src/components/me/**/*.tsx",
      "src/components/radar/**/*.tsx",
      "src/components/storefront/**/*.tsx",
      "src/components/layout/**/*.tsx",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "ImportDeclaration[source.value='@/components/layout/AppPageShell']",
          message: "AppPageShell is deprecated. Use PageShell from '@/components/ui/page-shell'.",
        },
        {
          selector: "ImportDeclaration[source.value='@/components/layout/UniversePageShell']",
          message: "UniversePageShell is deprecated. Use PageShell from '@/components/ui/page-shell'.",
        },
        {
          selector: "ImportDeclaration[source.value='@/components/layout/SEOPageShell']",
          message: "SEOPageShell is deprecated. Use PageShell from '@/components/ui/page-shell'.",
        },
      ],
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    ignores: [
      "src/test/**",
      "src/e2e/**",
      "src/lib/guards/mock-data-guard.ts",
      "src/lib/data-quality/**",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "FunctionDeclaration[id.name=/^generateMock/]",
          message: "generateMock* functions are banned. Use real data sources or empty states.",
        },
        {
          selector: "VariableDeclarator[id.name=/^generateMock/]",
          message: "generateMock* functions are banned. Use real data sources or empty states.",
        },
        {
          selector: "ExportNamedDeclaration > FunctionDeclaration[id.name=/^generateMock/]",
          message: "generateMock* functions are banned. Use real data sources or empty states.",
        },
      ],
    },
  },
  // ── Per-pillar route ownership ─────────────────────────────────────
  // App.tsx is a provider shell only. All <Route> declarations must live
  // in the correct pillar module under src/routes/<pillar>.routes.tsx.
  {
    files: ["src/App.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name='Route']",
          message:
            "Do not add <Route> in src/App.tsx. Add the route to the correct pillar file at src/routes/<pillar>.routes.tsx (e.g. dashboard.routes.tsx, radar.routes.tsx, admin.routes.tsx).",
        },
        {
          selector: "FunctionDeclaration[id.name=/^generateMock/]",
          message: "generateMock* functions are banned. Use real data sources or empty states.",
        },
        {
          selector: "VariableDeclarator[id.name=/^generateMock/]",
          message: "generateMock* functions are banned. Use real data sources or empty states.",
        },
        {
          selector: "ExportNamedDeclaration > FunctionDeclaration[id.name=/^generateMock/]",
          message: "generateMock* functions are banned. Use real data sources or empty states.",
        },
      ],
    },
  },
  // src/routes/index.tsx is the aggregator. It may only contain catch-all
  // routes (path="*" and path="/seo/*"); every other <Route> belongs in
  // the owning pillar module.
  {
    files: ["src/routes/index.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "JSXOpeningElement[name.name='Route']:not(:has(JSXAttribute[name.name='path'] > Literal[value='*'])):not(:has(JSXAttribute[name.name='path'] > Literal[value='/seo/*']))",
          message:
            "Only catch-all <Route> elements (path=\"*\" and path=\"/seo/*\") are allowed in src/routes/index.tsx. Add your route to the correct pillar file at src/routes/<pillar>.routes.tsx.",
        },
        {
          selector: "FunctionDeclaration[id.name=/^generateMock/]",
          message: "generateMock* functions are banned. Use real data sources or empty states.",
        },
        {
          selector: "VariableDeclarator[id.name=/^generateMock/]",
          message: "generateMock* functions are banned. Use real data sources or empty states.",
        },
        {
          selector: "ExportNamedDeclaration > FunctionDeclaration[id.name=/^generateMock/]",
          message: "generateMock* functions are banned. Use real data sources or empty states.",
        },
      ],
    },
  },
  // Pillar route files must stay self-contained: they cannot import other
  // pillar route modules. Cross-pillar aggregation happens only in
  // src/routes/index.tsx. This preserves the per-pillar boundaries that
  // prevent cross-pillar merge conflicts.
  ...(() => {
    // Each entry maps a pillar route file to the page-name prefixes it owns.
    // Pages destructured from @/app/app-route-registry (and any direct
    // ImportSpecifier) must use a prefix owned by the current pillar. Pillars
    // without a unique prefix own none and therefore may not reference any of
    // the prefixed foreign-pillar pages.
    // Only "Admin" is enforced as an owned prefix. Other pillar prefixes
    // (Driver, Merchant, Wallet, ...) are not unique — the admin pillar
    // legitimately owns pages like DriverLivePage or AdminWalletDiagnosticsPage
    // that monitor other pillars from an ops perspective. Enforcing Admin
    // alone eliminates the primary risk called out in the task: non-admin
    // pillars accidentally exposing admin-only pages.
    const PILLAR_OWNERSHIP = {
      "admin.routes.tsx": ["Admin"],
      "auth.routes.tsx": [],
      "dashboard.routes.tsx": [],
      "deeplinks.routes.tsx": [],
      "driver.routes.tsx": [],
      "legal.routes.tsx": [],
      "me.routes.tsx": [],
      "merchant.routes.tsx": [],
      "onboarding.routes.tsx": [],
      "orbit.routes.tsx": [],
      "pro.routes.tsx": [],
      "radar.routes.tsx": [],
      "seo.routes.tsx": [],
      "wallet.routes.tsx": [],
    };
    const ALL_OWNED_PREFIXES = [
      ...new Set(Object.values(PILLAR_OWNERSHIP).flat()),
    ];
    const pillarFileOf = (prefix) =>
      Object.entries(PILLAR_OWNERSHIP).find(([, owned]) =>
        owned.includes(prefix),
      )[0];

    const commonSelectors = [
      {
        selector: "ImportDeclaration[source.value=/\\.routes$/]",
        message:
          "Pillar route files must not import other pillar route modules. Keep each pillar self-contained; aggregate routes only in src/routes/index.tsx.",
      },
      {
        selector: "FunctionDeclaration[id.name=/^generateMock/]",
        message:
          "generateMock* functions are banned. Use real data sources or empty states.",
      },
      {
        selector: "VariableDeclarator[id.name=/^generateMock/]",
        message:
          "generateMock* functions are banned. Use real data sources or empty states.",
      },
      {
        selector:
          "ExportNamedDeclaration > FunctionDeclaration[id.name=/^generateMock/]",
        message:
          "generateMock* functions are banned. Use real data sources or empty states.",
      },
    ];

    return Object.entries(PILLAR_OWNERSHIP).map(([pillarFile, owned]) => {
      const foreign = ALL_OWNED_PREFIXES.filter((p) => !owned.includes(p));
      const foreignSelectors = foreign.flatMap((prefix) => {
        const owner = pillarFileOf(prefix);
        const msg = `Page identifiers starting with "${prefix}" belong to the ${prefix.toLowerCase()} pillar. Move this route to src/routes/${owner}.`;
        return [
          {
            selector: `Property[key.name=/^${prefix}[A-Z]/]`,
            message: msg,
          },
          {
            selector: `ImportSpecifier[imported.name=/^${prefix}[A-Z]/]`,
            message: msg,
          },
        ];
      });
      return {
        files: [`src/routes/${pillarFile}`],
        rules: {
          "no-restricted-syntax": [
            "error",
            ...commonSelectors,
            ...foreignSelectors,
          ],
        },
      };
    });
  })(),
);
