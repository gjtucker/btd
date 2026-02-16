import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative base keeps built assets loading correctly whether the app is
  // hosted at domain root, in a GitHub Pages project subpath, or a custom domain.
  base: process.env.BASE_PATH ?? './',
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
