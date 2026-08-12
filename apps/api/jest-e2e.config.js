/**
 * E2E test config — runs *.e2e-spec.ts under test/ against a live Postgres +
 * Redis. Lives at the package root so rootDir === package dir and the tsconfig
 * path is unambiguous.
 */
module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/test'],
  testRegex: '.*\\.e2e-spec\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', isolatedModules: true }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testTimeout: 60000,
  // The Throttler's Redis client and other pooled connections can keep the
  // event loop alive after tests complete; forceExit ensures Jest exits.
  forceExit: true,
};
