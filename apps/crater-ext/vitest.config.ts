import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { resolve } from 'path'

export default defineConfig({
    plugins: [svelte({ hot: false })],
    test: {
        environment: 'jsdom',
        setupFiles: ['./src/__tests__/setup.ts'],
        include: ['src/**/*.{test,spec}.{js,ts}'],
        exclude: ['dist/**', 'out/**', 'node_modules/**', 'src/test/**'],
        globals: true,
        coverage: {
            reporter: ['text', 'lcov'],
            include: ['src/**/*.ts'],
            exclude: ['src/test/**', 'src/__tests__/**', 'src/webview/**'],
        },
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
            vscode: resolve(__dirname, './src/__tests__/mocks/vscode'),
        },
    },
})
