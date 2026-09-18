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
      const outDir = resolve(rootDir, 'dist')

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

/** Hostinger CDN caches fixed asset names for a week — bust via query on each build. */
function cacheBustAssets() {
  const v = Date.now()
  return {
    name: 'cache-bust-assets',
    transformIndexHtml(html) {
      return html.replace(/(\/vr\/assets\/[^"'?\s]+)/g, `$1?v=${v}`)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/vr/',
  plugins: [react(), copyTourAssets(), cacheBustAssets()],
  server: {
    port: 5173,
    strictPort: true,
    // Allow embedding in the local spinner iframe for analytics E2E
    headers: {
      'Content-Security-Policy': "frame-ancestors 'self' http://localhost:* http://127.0.0.1:*",
    },
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/index.js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
    }
  }
})
