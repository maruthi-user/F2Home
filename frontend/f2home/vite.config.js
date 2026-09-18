import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // VITE_BASE_PATH lets the GitHub Pages deploy serve the app from the
  // /<repo>/ sub path (e.g. /F2Home/) while local / Capacitor builds stay at
  // the root. Set by .github/workflows/devf2home.yml. Accessed via globalThis
  // so ESLint's browser no-undef rule does not flag the bare identifier.
  base: globalThis.process?.env?.VITE_BASE_PATH || "/",
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3001,
    open: true,
    host: true
  },
  build: {
    outDir: 'build',
    assetsDir: 'assets',
    sourcemap: true,
  },
  css: {
    modules: {
      localsConvention: 'camelCase'
    },
    preprocessorOptions: {
      scss: {
        additionalData: `@import "./src/assets/styles/variables.scss";`
      }
    }
  },
  esbuild: {
    loader: "jsx",
    include: /src\/.*\.[tj]sx?$/,
  }
});