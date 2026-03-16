import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // In development, proxy /api requests to the Express backend
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  // For GitHub Pages: set base to your repo name when deploying
  // base: '/git-UI-toolbix/',
})
