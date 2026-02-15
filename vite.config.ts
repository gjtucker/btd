import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const githubRepository = process.env.GITHUB_REPOSITORY;
const derivedPagesBase = (() => {
  if (!githubRepository) return '/';

  const [owner, repo] = githubRepository.split('/');
  if (!owner || !repo) return '/';

  return repo.toLowerCase() === `${owner.toLowerCase()}.github.io`
    ? '/'
    : `/${repo}/`;
})();

export default defineConfig({
  // Use a relative base path so the build works on both project pages
  // (/<repo>/) and user/org pages (/), as well as custom domains.
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
