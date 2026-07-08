import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

function chunkVendorPackage(id: string) {
  if (!id.includes('node_modules')) return undefined

  if (/[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/.test(id)) {
    return 'react-vendor'
  }
  if (id.includes('node_modules/@tanstack/')) return 'query-vendor'
  if (id.includes('node_modules/@radix-ui/')) return 'radix-vendor'
  if (id.includes('node_modules/lucide-react/')) return 'icons-vendor'
  if (id.includes('node_modules/framer-motion/')) return 'motion-vendor'
  if (
    id.includes('node_modules/recharts/') ||
    id.includes('node_modules/d3-') ||
    id.includes('node_modules/victory-vendor/')
  ) {
    return 'charts-vendor'
  }
  if (
    id.includes('node_modules/react-hook-form/') ||
    id.includes('node_modules/@hookform/') ||
    id.includes('node_modules/zod/')
  ) {
    return 'forms-vendor'
  }
  if (
    id.includes('node_modules/date-fns/') ||
    id.includes('node_modules/react-day-picker/')
  ) {
    return 'date-vendor'
  }
  if (id.includes('node_modules/pdfjs-dist/')) return 'pdf-vendor'
  if (
    id.includes('node_modules/@xyflow/') ||
    id.includes('node_modules/dagre/')
  ) {
    return 'graph-vendor'
  }

  return undefined
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // Don't rewrite - backend expects /api/v1 prefix
        // Follow redirects to prevent auth header loss on cross-origin redirects
        followRedirects: true,
      },
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: chunkVendorPackage,
      },
    },
  },
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
  worker: {
    format: 'es',
  },
})
