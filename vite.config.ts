import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative base so the build also runs as a browser extension (chrome-extension://…)
export default defineConfig({
  base: './',
  plugins: [react()],
})
