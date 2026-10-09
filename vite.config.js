import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['exceljs'],
  },
  build: {
    commonjsOptions: {
      include: [/exceljs/, /node_modules/],
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3006',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3006',
        changeOrigin: true,
      },
    },
  },
});
