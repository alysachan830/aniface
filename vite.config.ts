import { defineConfig } from 'vite'
import { resolve } from 'path'

// Vite config for demo/development builds
export default defineConfig({
  root: 'demo',
  build: {
    outDir: '../dist-demo',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      'aniface': resolve(__dirname, './src/index.ts')
    }
  }
})

