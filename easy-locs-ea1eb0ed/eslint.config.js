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
);
