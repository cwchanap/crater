import eslint from '@eslint/js'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'

export default [
    {
        files: ['**/*.{js,ts}'],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module',
            },
            globals: {
                console: 'readonly',
                process: 'readonly',
                Buffer: 'readonly',
                __dirname: 'readonly',
                module: 'readonly',
                require: 'readonly',
                setTimeout: 'readonly',
                document: 'readonly',
                window: 'readonly',
                acquireVsCodeApi: 'readonly',
                Thenable: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
        },
        rules: {
            ...eslint.configs.recommended.rules,
            ...tseslint.configs.recommended.rules,
            '@typescript-eslint/no-unused-vars': 'warn',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-require-imports': 'off',
            'no-console': 'off',
            'no-undef': 'off',
        },
    },
    {
        files: ['*.config.js', 'esbuild.js'],
        languageOptions: {
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'commonjs',
            },
            globals: {
                console: 'readonly',
                process: 'readonly',
                module: 'readonly',
                require: 'readonly',
                __dirname: 'readonly',
            },
        },
        rules: {
            '@typescript-eslint/no-require-imports': 'off',
            'no-undef': 'off',
        },
    },
    {
        ignores: ['dist/', 'out/', 'node_modules/', '**/*.svelte'],
    },
]
