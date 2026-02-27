import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (id.includes('@supabase/supabase-js') || id.includes('jose')) return 'auth-supabase'
          // Keep Recharts in default chunking to avoid runtime init-order issues
          if (id.includes('recharts')) return undefined
          if (id.includes('qr-scanner')) return 'qr'
          if (id.includes('@mui/') || id.includes('@emotion/')) return 'mui'
          if (id.includes('@radix-ui/')) return 'radix'

          return 'vendor'
        },
      },
    },
  },
})
