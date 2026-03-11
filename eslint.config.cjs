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
      'supabase_migration_and_seed.sql',
      'supabase_schedule_migration.sql',
      'migration_recurring_activities.sql'
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
  }
];
