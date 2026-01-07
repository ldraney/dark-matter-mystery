import { defineConfig } from 'vite'

export default defineConfig({
  base: '/dark-matter-mystery/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        solar: 'solar.html',
        galaxy: 'galaxy.html',
        earthquake: 'earthquake.html'
      }
    }
  }
})
