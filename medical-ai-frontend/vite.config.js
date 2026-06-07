import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ==============================================================
// vite.config.js — Vite + React config
// ==============================================================
// proxy: forwards /api/* requests to backend during development
// This avoids CORS issues when running both on localhost
// React: http://localhost:5173
// Backend: http://localhost:5000
//
// With proxy: fetch('/api/auth/login') → vite proxies to localhost:5000/api/auth/login
// Without proxy: you'd hit CORS issues or need to type full URL everywhere
// ==============================================================
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        // important: proxy forwards cookies too
        // without this, httpOnly cookie-based auth won't work via proxy
        secure: false,
      }
    }
  }
})