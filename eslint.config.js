import eslintReact from '@eslint-react/eslint-plugin';
import js from '@eslint/js';
import json from '@eslint/json';
import stylistic from '@stylistic/eslint-plugin';
import perfectionist from 'eslint-plugin-perfectionist';
import reactHooks from 'eslint-plugin-react-hooks';
import unicorn from 'eslint-plugin-unicorn';
import yml from 'eslint-plugin-yml';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const jsTsFiles = ['**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}'];
const tsFiles = ['**/*.{ts,tsx,mts,cts}'];

export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    '**/public/**',
    '**/with-cypress-app/**',
    '**/next-env.d.ts',
    'package-lock.json',
  ]),

  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      unicorn.configs.unopinionated,
      stylistic.configs.customize({
        indent: 2,
        jsx: true,
        quotes: 'single',
        // Match existing codebase (Biome left semis alone)
        semi: true,
      }),
      perfectionist.configs['recommended-natural'],
      eslintReact.configs['recommended-typescript'],
      reactHooks.configs.flat.recommended,
    ],
    files: jsTsFiles,
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
      sourceType: 'module',
    },
    rules: {
      '@eslint-react/dom-no-missing-button-type': 'error',
      '@eslint-react/dom-no-missing-iframe-sandbox': 'error',
      '@eslint-react/dom-no-unsafe-target-blank': 'error',
      '@eslint-react/no-unstable-context-value': 'warn',
      '@eslint-react/no-unstable-default-props': 'warn',
      '@stylistic/jsx-quotes': ['error', 'prefer-single'],
      '@stylistic/multiline-ternary': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/require-await': 'off',
      'no-useless-assignment': 'off',
      'unicorn/no-array-sort': 'off',
      'unicorn/no-declarations-before-early-exit': 'off',
      'unicorn/no-empty-file': 'off',
      'unicorn/no-process-exit': 'off',
      'unicorn/no-top-level-side-effects': 'off',
      'unicorn/no-unnecessary-global-this': 'off',
      'unicorn/prefer-await': 'off',
      'unicorn/prefer-logical-operator-over-ternary': 'off',
      'unicorn/prefer-number-coercion': 'off',
      'unicorn/prefer-top-level-await': 'off',
      'unicorn/require-array-sort-compare': 'off',
    },
  },

  // Type-aware TS rules (projectService). Skip no-unsafe-* — vinext/Next
  // packages often resolve as error types under TS6 API shim.
  {
    extends: [...tseslint.configs.recommendedTypeCheckedOnly],
    files: tsFiles,
    rules: {
      '@eslint-react/no-leaked-conditional-rendering': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/require-await': 'off',
    },
  },

  {
    ...tseslint.configs.disableTypeChecked,
    files: ['**/*.{js,mjs,cjs,jsx}'],
  },

  {
    files: ['**/*.json'],
    ignores: ['**/package-lock.json'],
    language: 'json/json',
    ...json.configs.recommended,
  },

  ...yml.configs.recommended,
]);
