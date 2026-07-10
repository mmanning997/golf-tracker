import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' so the built app also works from a file:// path or a GitHub Pages subfolder.
export default defineConfig({
  plugins: [react()],
  base: './',
})
