module.exports = {
    testMatch: ['**/tests/**/*.[jt]s?(x)'],
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    testPathIgnorePatterns: ['/node_modules/', '/tests/__mocks__/'],
    moduleNameMapper: {
        '^bundle-text:.*$': '<rootDir>/tests/__mocks__/emptyStringModule.js'
    }
  };
