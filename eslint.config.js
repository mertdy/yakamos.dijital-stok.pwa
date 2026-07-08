import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-useless-assignment': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'src/features/*/*/*',
                '../../features/*/*/*',
                '../features/*/*/*'
              ],
              message:
                'Lütfen feature modüllerini Public API (index.ts) üzerinden import edin (Örn: src/features/sales). Modül içine doğrudan sızmayın.'
            }
          ]
        }
      ]
    },
    languageOptions: {
      globals: globals.browser
    }
  }
]);
