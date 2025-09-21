import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { resolve } from 'path'

export default defineConfig({
    plugins: [svelte({ hot: false })],
    test: {
        environment: 'jsdom',
        setupFiles: ['./src/__tests__/setup.ts'],
        include: ['src/**/*.{test,spec}.{js,ts}'],
        exclude: ['dist/**', 'out/**', 'node_modules/**'],
        globals: true,
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
            vscode: resolve(__dirname, './src/__tests__/mocks/vscode'),
        },
    },
})
