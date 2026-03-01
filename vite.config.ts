import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: [],
      },
      server: {
        port: 5173,
        host: '0.0.0.0',
        proxy: {
          '/api/google-sheet': {
            target: 'https://script.google.com',
            changeOrigin: true,
            secure: false,      
            rewrite: (path) => path.replace(/^\/api\/google-sheet/, '/macros/s/AKfycbwXf765Dm8vSlwfMvEC1OR_tUExynqAuFQtooQyWNMtLIZhOfgLuAkuMSIaFoQNU-Mb/exec'),
          },
          '/api/geoserver': {
            target: 'https://dikayuh.banjarmasinkota.go.id',
            changeOrigin: true,
            secure: false,
            rewrite: (path) => path.replace(/^\/api\/geoserver/, '/geoserver'),
          },
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        chunkSizeWarningLimit: 1600,
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor-maplibre': ['maplibre-gl'],
              'vendor-xlsx': ['xlsx'],
              'vendor-genai': ['@google/genai'],
            }
          }
        }
      },
      esbuild: {
        target: "es2022"
      }
    };
});
