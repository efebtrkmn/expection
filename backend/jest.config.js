/**
 * Jest Konfigürasyonu — Expection Backend
 *
 * Coverage Threshold: Her metrik için minimum %80
 * Test Environment: node (NestJS için)
 */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.module.ts',
    '!**/main.ts',
    '!**/*.dto.ts',
    '!**/*.decorator.ts',
    '!**/*.interface.ts',
    '!**/prisma/**',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  roots: ['<rootDir>', '../test'],
  moduleNameMapper: {
    '^decimal\\.js$': '<rootDir>/../node_modules/decimal.js',
  },
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],
};
