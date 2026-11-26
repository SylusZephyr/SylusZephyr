import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/**', 'www/**', 'android/**', 'ios/**', 'desktop/**', 'dist/**', 'js/locales/**', 'js/vendor/**'] },
  js.configs.recommended,
  {
    files: ['js/**/*.js', 'sw.js'],
    languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: { ...globals.browser } },
    rules: {
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
      eqeqeq: ['error', 'smart'],
      'no-shadow': 'off',
      'no-implicit-globals': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'prefer-const': ['error', { destructuring: 'all' }],
    },
  },
  {
    files: ['scripts/**/*.{js,mjs,cjs}', 'tests/**/*.mjs', 'eslint.config.mjs'],
    languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: { ...globals.node, ...globals.browser, axe: 'readonly' } },
    rules: { 'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }], eqeqeq: ['error', 'smart'] },
  },
  { files: ['**/*.cjs'], languageOptions: { sourceType: 'commonjs' } },
];
