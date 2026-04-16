import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
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
