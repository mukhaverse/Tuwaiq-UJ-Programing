import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative asset paths, so the build works from any sub-path —
  // e.g. GitHub Pages serves this site at /ptmain/, not at the domain root.
  // (Safe because the site only uses #hash links, never real routes.)
  base: './',
})
