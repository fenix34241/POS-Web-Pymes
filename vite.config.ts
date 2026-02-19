import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // --- AGREGAMOS ESTA SECCIÓN PARA DOCKER ---
  server: {
    host: true,         // Permite que el contenedor sea accesible desde fuera
    port: 5173,         // El puerto estándar de Vite
    watch: {
      usePolling: true, // Crucial para que Docker detecte cuando guardas cambios en Windows
    },
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://api:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://api:3001',
        changeOrigin: true,
      },
    },
  },
  // ------------------------------------------
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
})