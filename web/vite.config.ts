import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Telegram Mini App is served over HTTPS and embedded in an iframe/webview.
// Using a relative base keeps asset paths working regardless of the host path.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
})
