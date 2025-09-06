import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
    {
        // Global ignores
        ignores: [
            '**/dist/**',
            '**/build/**',
            '**/out/**',
            '**/.svelte-kit/**',
            '**/node_modules/**',
            '**/.turbo/**',
            '**/coverage/**',
        ],
    },
    {
        // Base config for all files
        files: ['**/*.{js,mjs,cjs,ts,tsx,jsx}'],
        extends: [js.configs.recommended, prettier],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                console: 'readonly',
                process: 'readonly',
            },
        },
        rules: {
            // General rules
            'no-console': 'warn',
            'no-debugger': 'warn',
            'prefer-const': 'error',
            'no-var': 'error',
        },
    },
    {
        // Node.js config files
        files: [
            '**/*.config.{js,ts,mjs}',
            '**/esbuild.js',
            '**/tailwind.config.js',
        ],
        languageOptions: {
            globals: {
                module: 'readonly',
                require: 'readonly',
                process: 'readonly',
                console: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
            },
        },
        rules: {
            'no-console': 'off',
            '@typescript-eslint/no-require-imports': 'off',
        },
    },
    {
        // TypeScript-specific config
        files: ['**/*.{ts,tsx}'],
        extends: [...tseslint.configs.recommended],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_' },
            ],
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/prefer-as-const': 'error',
        },
    },
    {
        // TypeScript config files (no strict project rules)
        files: ['**/*.config.ts', '**/tsup.config.ts', '**/vitest-setup-*.ts'],
        extends: [...tseslint.configs.recommended],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: false, // Don't require tsconfig for config files
            },
        },
        rules: {
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_' },
            ],
            '@typescript-eslint/no-explicit-any': 'warn',
            'no-console': 'off',
        },
    },
    {
        // React-specific config for UI components
        files: ['packages/ui-components/**/*.{ts,tsx}'],
        rules: {
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_|^props$' },
            ],
        },
    },
    {
        // VS Code extension specific config
        files: ['apps/crater-ext/**/*.{ts,js}'],
        rules: {
            'no-console': 'off', // Console logging is common in VS Code extensions
        },
    },
    {
        // VS Code extension webview specific config (browser environment)
        files: ['apps/crater-ext/src/webview.ts'],
        extends: [...tseslint.configs.recommended],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: './apps/crater-ext/tsconfig.webview.json',
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            'no-console': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_' },
            ],
        },
    },
    {
        // Test files config
        files: ['**/*.{test,spec}.{js,ts,tsx}'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            'no-console': 'off',
        },
    }
)
