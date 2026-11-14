module.exports = {
    testMatch: ['**/tests/**/*.[jt]s?(x)'],
    preset: 'ts-jest',
    // Each test file is transpiled on its own, without type checking (much faster);
    // `npm run check` type-checks the tests with everything else.
    transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }]
    },
    testEnvironment: 'jsdom',
    testPathIgnorePatterns: ['/node_modules/', '/tests/__mocks__/', '/tests/shared/', '/tests/browser/', '/tests/e2e/'],
    moduleNameMapper: {
        '^bundle-text:.*$': '<rootDir>/tests/__mocks__/emptyStringModule.js'
    }
  };
