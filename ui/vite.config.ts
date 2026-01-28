import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              console.log(`Proxying ${req.method} request to: ${proxyReq.protocol}//${proxyReq.host}${proxyReq.path}`);
            });
            proxy.on('proxyRes', (proxyRes) => {
              console.log(`Response from target: ${proxyRes.statusCode}`);
            });
            proxy.on('error', (err) => {
              console.error('Proxy error:', err);
            });
          },
        },
      },
    },
  };
});
