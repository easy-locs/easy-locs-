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
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='style'] > JSXExpressionContainer > ObjectExpression > Property[key.name='color'][value.type='Literal']",
          message: "Avoid hardcoded color in inline style. Use design tokens from '@/config/ui' (COLOR/ACCENT) or Tailwind classes.",
        },
        {
          selector: "JSXAttribute[name.name='style'] > JSXExpressionContainer > ObjectExpression > Property[key.name='backgroundColor'][value.type='Literal']",
          message: "Avoid hardcoded backgroundColor in inline style. Use design tokens from '@/config/ui' or Tailwind classes (bg-*).",
        },
        {
          selector: "JSXAttribute[name.name='style'] > JSXExpressionContainer > ObjectExpression > Property[key.name='borderColor'][value.type='Literal']",
          message: "Avoid hardcoded borderColor in inline style. Use design tokens from '@/config/ui' or Tailwind classes (border-*).",
        },
        {
          selector: "JSXAttribute[name.name='style'] > JSXExpressionContainer > ObjectExpression > Property[key.name='fontSize'][value.type='Literal']",
          message: "Avoid hardcoded fontSize. Use TEXT tokens from '@/config/ui' or Tailwind text-* classes for consistent typography.",
        },
      ],
    },
  },
);
