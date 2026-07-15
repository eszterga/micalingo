import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => {
  return {
    plugins: [react()],
    // 💡 If we are running locally ('serve'), use './' so local files resolve.
    // Otherwise, use '/micalingo/' for production builds.
    base: command === 'serve' ? './' : '/micalingo/',
    server: {
      port: 8080,
      strictPort: true
    },
    build: {
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          }
        }
      }
    }
  }
})
