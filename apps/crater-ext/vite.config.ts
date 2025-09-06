import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
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
    },
    esbuild: {
        target: 'es2020',
    },
})
