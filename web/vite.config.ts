import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1', // Vite 8 defaults to IPv6 only, which breaks `localhost` on some resolvers
    port: 5173,
  },
})
