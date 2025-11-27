module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "unused-imports", "import"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  ignorePatterns: [
    "**/dist/**",
    "**/.next/**",
    "**/node_modules/**",
    "apps/web/postcss.config.js",
    "apps/web/check-icons.js",
    "apps/web/list-icons.js",
    "playwright.config.ts",
    "scripts/**"
  ],
  rules: {
    "unused-imports/no-unused-imports": "error",
    "import/no-unresolved": "error"
  },
  overrides: [
    {
      files: ["apps/web/**/*.{ts,tsx}"],
      extends: ["next/core-web-vitals", "plugin:react-hooks/recommended"],
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
        "@typescript-eslint/no-floating-promises": "error"
      }
    },
    {
      files: ["apps/api/**/*.{ts,tsx}"],
      parserOptions: {
        project: ['./apps/api/tsconfig.json'],
        tsconfigRootDir: __dirname
      },
      settings: {
        'import/resolver': {
          typescript: {
            project: './apps/api/tsconfig.json'
          }
        }
      },
      rules: {
        "@typescript-eslint/no-floating-promises": "error"
      }
    }
  ]
};
