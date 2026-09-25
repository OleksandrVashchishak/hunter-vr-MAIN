import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { cpSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = dirname(fileURLToPath(import.meta.url))

/** Copies tour runtime assets that live at repo root (not in public/) into dist. */
function copyTourAssets() {
  const assets = ['model.glb', 'panorams', 'mobile']

  return {
    name: 'copy-tour-assets',
    closeBundle() {
      const outDir = resolve(rootDir, this.environment?.config?.build?.outDir || 'dist')

      for (const item of assets) {
        const src = resolve(rootDir, item)
        if (!existsSync(src)) {
          console.warn(`[copy-tour-assets] missing: ${item}`)
          continue
        }
        cpSync(src, resolve(outDir, item), { recursive: true })
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/vr/',
  plugins: [react(), copyTourAssets()],
  server: {
    port: 5173,
    strictPort: true,
    // Allow embedding in the local spinner iframe for analytics E2E
    headers: {
      'Content-Security-Policy': "frame-ancestors 'self' http://localhost:* http://127.0.0.1:*",
    },
  },
  build: {
    // Content hashes in filenames — Hostinger CDN no longer serves stale
    // fixed index.js/index.css that desync CSS-module class hashes.
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
})
