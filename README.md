<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Bloons-style Tower Defense (Vite + React)

This is a client-only web game built with Vite and React.

## Local development

**Prerequisite:** Node.js

1. Install dependencies:
   `npm install`
2. Start the dev server:
   `npm run dev`
3. Build production assets:
   `npm run build`

## Deploy to GitHub Pages

This repository includes a GitHub Actions workflow that deploys the built `dist/` output to GitHub Pages.

### One-time setup

1. Push this repository to GitHub.
2. In GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Push to `main` (or run the workflow manually) to publish.

### Notes

- For project pages (`https://<user>.github.io/<repo>/`), the workflow builds with the correct base path automatically.
- If you later use a custom domain or user/organization pages root, you can adjust the `--base` argument in `.github/workflows/deploy-pages.yml`.
