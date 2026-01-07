import { defineConfig } from 'vite'

export default defineConfig({
  base: '/dark-matter-mystery/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        galaxy: 'galaxy.html'
      }
    }
  }
})
