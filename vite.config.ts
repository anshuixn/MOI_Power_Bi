import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) return 'vendor'
            if (id.includes('recharts') || id.includes('d3')) return 'charts'
            if (id.includes('three') || id.includes('@react-three') || id.includes('postprocessing')) return 'three'
            if (id.includes('gsap')) return 'gsap'
            if (id.includes('lenis')) return 'vendor-misc'
            return 'vendor-misc'
          }
        }
      },
    },
  },
})
