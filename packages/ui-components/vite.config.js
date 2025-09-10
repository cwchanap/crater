import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import dts from 'vite-plugin-dts'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
    plugins: [
        svelte(),
        dts({
            insertTypesEntry: true,
            exclude: ['**/*.stories.*', '**/*.test.*'],
        }),
    ],
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'CraterUI',
            formats: ['es', 'cjs'],
            fileName: (format) => `index.${format === 'es' ? 'mjs' : 'js'}`,
        },
        rollupOptions: {
            external: ['svelte', 'svelte/internal'],
            output: {
                globals: {
                    svelte: 'svelte',
                },
            },
        },
        sourcemap: true,
    },
})
