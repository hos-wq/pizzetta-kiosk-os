import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: {
    '@': path.resolve(import.meta.dirname, 'src'),
    'lucide-react': path.resolve(import.meta.dirname, 'node_modules/lucide-react'),
    'react': path.resolve(import.meta.dirname, 'node_modules/react'),
    'react-dom': path.resolve(import.meta.dirname, 'node_modules/react-dom'),
  } },
  server: {
    fs: { allow: [path.resolve(import.meta.dirname, '../../UI')] },
    proxy: {
      '/api': 'http://127.0.0.1:8787',
      '/auth': 'http://127.0.0.1:8787',
    },
  },
})
