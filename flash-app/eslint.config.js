import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";

const tsFiles = ["**/*.{ts,tsx}"];

const projectIgnores = [
  "dist",
  "preview-host/dist",
  ".local-preview/**",
  "service/**",
  "src/generated/**",
  "src/components/reactbits/**",
  "src/components/magicui/**",
  "src/components/ui/**",
  "src/global.d.ts",
  "src/lib/service-api.ts",
  "plugins/**",
  "scripts/database-contract.d.mts",
];

const scopeToTsFiles = (config) => ({
  ...config,
  files: config.files ?? tsFiles,
});

const reactHooksRecommended = reactHooks.configs.flat["recommended-latest"];

export default defineConfig([
  globalIgnores(projectIgnores),
  ...tseslint.configs.strictTypeChecked.map(scopeToTsFiles),
  {
    files: tsFiles,
    languageOptions: {
      ecmaVersion: 2020,
      parserOptions: {
        project: [
          "./tsconfig.eslint.strict.json",
          "./preview-host/tsconfig.app.json",
          "./preview-host/tsconfig.node.json",
        ],
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        lingguang: "writable",
      },
    },
    rules: {
      "@typescript-eslint/strict-boolean-expressions": [
        "error",
        {
          allowAny: false,
          allowNullableBoolean: false,
          allowNullableEnum: false,
          allowNullableNumber: false,
          allowNullableObject: true,
          allowNullableString: false,
          allowNumber: false,
          allowString: false,
        },
      ],
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/prefer-nullish-coalescing": "error",
      "@typescript-eslint/require-array-sort-compare": "error",
      "@typescript-eslint/no-use-before-define": [
        "error",
        {
          functions: false,
          classes: true,
          variables: true,
        },
      ],
    },
  },
  {
    files: ["**/*.tsx"],
    plugins: reactHooksRecommended.plugins,
    rules: reactHooksRecommended.rules,
  },
  {
    files: ["**/*.tsx"],
    plugins: reactRefresh.configs.vite.plugins,
    rules: reactRefresh.configs.vite.rules,
  },
]);
