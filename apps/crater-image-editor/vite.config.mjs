import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { resolve } from 'path'
import { fileURLToPath, URL } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(({ command, mode }) => ({
    plugins: [svelte()],

    css: {
        postcss: './postcss.config.js',
    },

    server: {
        port: 3002,
        hmr: {
            port: 3003,
        },
        cors: true,
        host: 'localhost',
    },

    build: {
        lib: {
            entry: resolve(__dirname, 'src/webview.ts'),
            name: 'WebView',
            fileName: 'webview',
            formats: ['iife'],
        },
        outDir: 'dist',
        emptyOutDir: false,
        rollupOptions: {
            output: {
                format: 'iife',
                inlineDynamicImports: true,
                entryFileNames: 'webview.js',
            },
        },
        target: 'es2020',
        sourcemap: true,
        watch: mode === 'development' ? {} : null,
    },
    esbuild: {
        target: 'es2020',
    },

    define: {
        __DEV__: mode === 'development',
        __HMR_ENABLED__: command === 'serve',
    },
}))
