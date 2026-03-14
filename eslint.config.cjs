const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const reactHooksPlugin = require('eslint-plugin-react-hooks');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'web-build/**',
      'assets/**',
      'compile.log',
      'compile_errors.txt',
      'archive/generated/**'
    ]
  },
  {
    files: ['**/*.{js,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooksPlugin
    },
    rules: {
      'no-unreachable': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],
      'react-hooks/rules-of-hooks': 'error'
    }
  },
  {
    files: ['App.tsx', 'index.ts', 'src/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}'],
    ignores: ['lib/**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ]
    }
  }
];
