import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

const buildId = randomUUID()

export default defineConfig({
  define: {
    __APP_BUILD_ID__: JSON.stringify(buildId),
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'app-build-version',
      apply: 'build',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify({ buildId }),
        })
      },
    },
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
  },
  server: {
    host: true,
    watch: {
      ignored: ['**/openspec/**'],
    },
  },
})
