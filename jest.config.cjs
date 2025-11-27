/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/apps/web/tests/unit'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'mjs'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/apps/web/$1',
    '^@collabverse/api$': '<rootDir>/apps/api/src/index.ts',
    '^@collabverse/api/(.*)$': '<rootDir>/apps/api/src/$1',
    '^server-only$': '<rootDir>/apps/web/tests/__mocks__/server-only.js',
  },
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/apps/web/tsconfig.json',
        diagnostics: false,
      },
    ],
    // Используем babel-jest для JS файлов из node_modules (next-auth и связанные)
    '^.+\\.(js|jsx|mjs)$': 'babel-jest',
  },
  // Трансформируем ES modules пакеты (next-auth и связанные)
  // В pnpm структура: .pnpm/package@version/node_modules/package
  // Используем простой паттерн: не игнорируем пути, содержащие эти пакеты
  transformIgnorePatterns: [
    'node_modules/(?!.*(@auth|next-auth|jose|oauth4webapi|preact-render-to-string))',
  ],
  extensionsToTreatAsEsm: [],
  setupFilesAfterEnv: [],
};
