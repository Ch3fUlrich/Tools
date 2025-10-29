/* global console */
// eslint.config.mjs
// ESLint 9+ Flat Config with graceful fallbacks for missing dependencies

async function buildConfig() {
  // === Load @eslint/js with fallback ===
  let js;
  try {
    const m = await import("@eslint/js");
    js = m.default ?? m;
  } catch {
    console.warn("@eslint/js not available; using minimal fallback");
    js = { configs: { recommended: {} } };
  }

  // === Load optional plugins & parser ===
  let typescriptParser, typescriptPlugin, reactPlugin, reactHooksPlugin, jsxA11yPlugin;

  try {
    const m = await import("@typescript-eslint/parser");
    typescriptParser = m.default ?? m;
  } catch (e) {
    console.warn("Optional import @typescript-eslint/parser failed; continuing without it:", e && e.message ? e.message : e);
  }

  try {
    const m = await import("@typescript-eslint/eslint-plugin");
    typescriptPlugin = m.default ?? m;
  } catch (e) {
    console.warn("Optional import @typescript-eslint/eslint-plugin failed; continuing without it:", e && e.message ? e.message : e);
  }

  try {
    const m = await import("eslint-plugin-react");
    reactPlugin = m.default ?? m;
  } catch (e) {
    console.warn("Optional import eslint-plugin-react failed; continuing without it:", e && e.message ? e.message : e);
  }

  try {
    const m = await import("eslint-plugin-react-hooks");
    reactHooksPlugin = m.default ?? m;
  } catch (e) {
    console.warn("Optional import eslint-plugin-react-hooks failed; continuing without it:", e && e.message ? e.message : e);
  }

  try {
    const m = await import("eslint-plugin-jsx-a11y");
    jsxA11yPlugin = m.default ?? m;
  } catch (e) {
    console.warn("Optional import eslint-plugin-jsx-a11y failed; continuing without it:", e && e.message ? e.message : e);
  }

  // === Shared plugins object ===
  const plugins = {};
  if (typescriptPlugin) plugins["@typescript-eslint"] = typescriptPlugin;
  if (reactPlugin) plugins["react"] = reactPlugin;
  if (reactHooksPlugin) plugins["react-hooks"] = reactHooksPlugin;
  if (jsxA11yPlugin) plugins["jsx-a11y"] = jsxA11yPlugin;

  // === Shared language options ===
  const baseLanguageOptions = {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  };

  const baseGlobals = {
    React: "readonly",
    JSX: "readonly",
    console: "readonly",
    process: "readonly",
    module: "readonly",
    require: "readonly",
    __dirname: "readonly",
    __filename: "readonly",
  };

  const browserGlobals = {
    window: "readonly",
    document: "readonly",
    localStorage: "readonly",
    sessionStorage: "readonly",
    fetch: "readonly",
    setTimeout: "readonly",
    alert: "readonly",
    File: "readonly",
    HTMLInputElement: "readonly",
    HTMLElement: "readonly",
    HTMLFormElement: "readonly",
    Location: "readonly",
    URLSearchParams: "readonly",
  };

  const testGlobals = {
    describe: "readonly",
    it: "readonly",
    test: "readonly",
    expect: "readonly",
    beforeEach: "readonly",
    afterEach: "readonly",
    beforeAll: "readonly",
    afterAll: "readonly",
    vi: "readonly",
    global: "readonly",
  };

  // === Helper: create config ===
  function createConfig({ files, extraGlobals = {}, extraRules = {} }) {
    const languageOptions = {
      parser: typescriptParser,
      parserOptions: baseLanguageOptions,
      globals: { ...baseGlobals, ...extraGlobals },
    };

    const rules = {
      // TypeScript
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",

      // React
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Accessibility
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/anchor-has-content": "error",
      "jsx-a11y/aria-props": "error",
      "jsx-a11y/aria-proptypes": "error",
      "jsx-a11y/aria-unsupported-elements": "error",
      "jsx-a11y/role-has-required-aria-props": "error",
      "jsx-a11y/role-supports-aria-props": "error",

      // General
      "no-console": "warn",
      "no-debugger": "error",
      "prefer-const": "error",
      "no-var": "error",
      "no-unused-vars": "off",
      ...extraRules,
    };

    return {
      files,
      languageOptions,
      plugins,
      settings: { react: { version: "detect" } },
      rules,
    };
  }

  // === Build final config ===
  return [
    // Global ignores
    {
      ignores: [
        "**/node_modules/**",
        "**/.next/**",
        "**/out/**",
        "**/build/**",
        "**/coverage/**",
        "**/public/**",
        "**/scripts/**",
        "next-env.d.ts",
        "**/*.css",
        "**/*.md",
        "**/*.json",
        "**/*.config.js",
        "**/*.config.ts",
      ],
    },

    // Base recommended rules
    js.configs.recommended,

    // Main config (all JS/TS/JSX/TSX)
    createConfig({
      files: ["**/*.{js,jsx,ts,tsx}"],
    }),

    // Test files
    createConfig({
      files: [
        "**/__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}",
        "**/*.{test,spec}.{js,jsx,ts,tsx}",
        "**/*setup*.{js,ts}",
      ],
      extraGlobals: { ...browserGlobals, ...testGlobals },
      extraRules: {
        "@typescript-eslint/no-explicit-any": "off",
        "no-console": "off",
        "no-empty": "off",
      },
    }),

    // Browser-specific files (components, app, lib)
    createConfig({
      files: ["app/**/*.tsx", "components/**/*.tsx", "lib/**/*.ts"],
      extraGlobals: browserGlobals,
      extraRules: {
        "no-constant-condition": "off",
      },
    }),
  ];
}

// Export config using top-level await
export default await buildConfig();