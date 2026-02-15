import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const githubRepository = process.env.GITHUB_REPOSITORY;
const derivedPagesBase = githubRepository
  ? `/${githubRepository.split('/')[1]}/`
  : '/';

export default defineConfig({
  base: process.env.BASE_PATH ?? derivedPagesBase,
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
