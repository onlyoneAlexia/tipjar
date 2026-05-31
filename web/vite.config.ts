import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Bind dual-stack so `localhost` works whether it resolves to ::1 (IPv6) or 127.0.0.1 (IPv4).
    // Pinning to a single family breaks the other depending on how the OS resolves `localhost`.
    host: '::',
    port: 5173,
  },
})
