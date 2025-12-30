import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
/// <reference types="vitest" />

export default defineConfig({
    plugins: [react()],
    build: {
        outDir: 'dist',
        sourcemap: true,
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/tests/setup.ts',
        css: true,
    },
});
