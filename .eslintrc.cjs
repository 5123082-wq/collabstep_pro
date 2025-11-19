module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "unused-imports", "import", "react-hooks"],
  extends: ["next/core-web-vitals", "plugin:react-hooks/recommended"],
  ignorePatterns: [
    "**/dist/**",
    "**/.next/**",
    "apps/web/postcss.config.js",
    "playwright.config.ts",
    "apps/api/**",
    "scripts/**",
    "apps/web/eslint-rules/**",
    "apps/web/tests/**"
  ],
  parserOptions: {
    project: ['./apps/web/tsconfig.json'],
    tsconfigRootDir: __dirname
  },
  settings: {
    next: {
      rootDir: ["apps/web"]
    },
    'import/resolver': {
      typescript: {
        project: './apps/web/tsconfig.json'
      }
    }
  },
  rules: {
    "@next/next/no-html-link-for-pages": "off",
    "unused-imports/no-unused-imports": "error",
    "import/no-unresolved": "error",
    "@typescript-eslint/no-floating-promises": "error"
  }
};
