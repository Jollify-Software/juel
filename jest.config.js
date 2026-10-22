module.exports = {
    testMatch: ['**/tests/**/*.[jt]s?(x)'],
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    testPathIgnorePatterns: ['/node_modules/', '/tests/__mocks__/', '/tests/shared/', '/tests/browser/', '/tests/e2e/'],
    moduleNameMapper: {
        '^bundle-text:.*$': '<rootDir>/tests/__mocks__/emptyStringModule.js'
    }
  };
