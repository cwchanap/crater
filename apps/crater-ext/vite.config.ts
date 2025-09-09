import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { resolve } from 'path'

export default defineConfig(({ command, mode }) => ({
    plugins: [svelte()],

    css: {
        postcss: './postcss.config.js',
    },

    // Development server configuration for HMR
    server: {
        port: 3000,
        hmr: {
            port: 3001,
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
        emptyOutDir: false, // Don't clear dist folder (extension.js is there)
        rollupOptions: {
            output: {
                // Use IIFE format for VS Code webview compatibility
                format: 'iife',
                inlineDynamicImports: true,
                // Don't add hash to filename for predictable webview loading
                entryFileNames: 'webview.js',
            },
        },
        target: 'es2020',
        sourcemap: true,
        // Enable watch mode in development
        watch: mode === 'development' ? {} : null,
    },
    esbuild: {
        target: 'es2020',
    },

    // Define constants for different environments
    define: {
        __DEV__: mode === 'development',
        __HMR_ENABLED__: command === 'serve',
    },
}))
