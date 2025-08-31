import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: false, // We'll generate types with tsc
    splitting: false,
    sourcemap: true,
    clean: true,
})
