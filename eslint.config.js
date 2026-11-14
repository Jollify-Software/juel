import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import functional from 'eslint-plugin-functional';
import imprt from 'eslint-plugin-import'; // 'import' is ambiguous & prettier has trouble

// eslint.config.js. `npm run lint` gates CI on errors; warnings are reported only (QUESTIONS §48.4, 2026-11-14).
export default [
  // Built bundles, not juel's sources: examples/juel.js carries other packages' eslint-disable comments for rules this
  // config doesn't load, which eslint reports as errors.
  { ignores: ['dist/**', 'examples/**', 'coverage/**', 'playwright-report/**', 'test-results/**',
    // Google's own bootstrap loader snippet, kept as Google publishes it.
    'src/Visualization/Map/Providers/GoogleMapBootstrap.ts'] },
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          modules: true
        },
        ecmaVersion: 'latest',
        project: './tsconfig.json',
      },
    },

    plugins: {
      functional,
      import: imprt,
      '@typescript-eslint': ts,
      ts,
    },


    rules: {
      ...ts.configs['eslint-recommended'].rules,
      ...ts.configs['recommended'].rules,
      'ts/return-await': 2,
      // Warnings, not errors: juel takes `any` from the DOM and third-party APIs, and an unused name is tidied when its
      // file is next touched. A leading `_` marks one as meant.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      // The radial menu is a port that calls `this` `self` throughout.
      '@typescript-eslint/no-this-alias': ['error', { allowedNames: ['self'] }],
    }
  },
  {
    // juel's API objects are namespaces on purpose: JuelModule gathers them into `window.juel` (juel.toast,
    // juel.messageBox, …), and the string tables and helpers beside them follow the same shape.
    files: ['src/_Modules/**/*.ts', 'src/_Strings/**/*.ts', 'src/_Utils/**/*.ts', 'src/UniversalCssProperties.ts', 'src/Utilities/Animate/Events.ts'],
    rules: { '@typescript-eslint/no-namespace': 'off' },
  },
];
