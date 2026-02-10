import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Include JSON files from ai/ and companions/ directories
  publicDir: 'public',
  
  // Ensure JSON files are properly handled
  assetsInclude: ['**/*.json'],
  
  // Copy additional directories to dist
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
    // Copy non-standard public assets
    copyPublicDir: true,
  },
})
