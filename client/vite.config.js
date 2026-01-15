import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy({
      // Esto obliga a Vite a generar código compatible con navegadores viejos
      targets: ['chrome >= 87', 'firefox >= 78', 'edge >= 88'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime']
    })
  ],
  server: {
    port: 3000, // Forzamos que corra en el puerto 3000 (estándar)
  }
})