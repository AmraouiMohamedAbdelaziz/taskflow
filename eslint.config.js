import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import hooks from 'eslint-plugin-react-hooks';
import refresh from 'eslint-plugin-react-refresh';
export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**'] },
  js.configs.recommended,
  { files: ['scripts/browser-audit.mjs'], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  ...tseslint.configs.recommended,
  { files: ['**/*.js', '**/*.ts', '**/*.tsx'], languageOptions: { globals: globals.node } },
  { files: ['apps/web/public/*.js'], languageOptions: { globals: globals.browser } },
  { files: ['apps/web/src/**/*.{ts,tsx}'], languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': hooks, 'react-refresh': refresh },
    rules: { ...hooks.configs.recommended.rules, 'react-refresh/only-export-components': ['error', { allowConstantExport: true }] } },
  { files: ['**/*.{ts,tsx}'], rules: { '@typescript-eslint/no-explicit-any': 'error' } },
);
