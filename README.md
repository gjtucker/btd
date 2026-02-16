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

For a step-by-step checklist, see [`docs/GITHUB_PAGES_SETUP.md`](docs/GITHUB_PAGES_SETUP.md).

1. Push this repository to GitHub.
2. In GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Push to `main` (or run the workflow manually) to publish.

### Notes

- The Vite build uses a relative asset base by default, so the same build works for project pages (`https://<user>.github.io/<repo>/`), user/org pages (`https://<user>.github.io/`), and custom domains.
- If needed, you can still override the base via `BASE_PATH` at build time.

### Troubleshooting GitHub Pages

- Ensure the repository is **Public** (recommended for easiest GitHub Pages setup) and that **Settings → Pages → Source** is set to **GitHub Actions**.
- Confirm the deploy workflow runs on pushes to `main`.
- If the site loads but has missing assets, check the browser network tab for 404s and verify the deployed `dist/` files include the referenced `assets/*` bundle files.

## Checking git history for sensitive data

Before making a repository public, scan all commits for obvious secrets:

```bash
git rev-list --all > /tmp/all_revs.txt
git grep -n -I -E '(AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z\-_]{35}|ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{80,}|-----BEGIN (RSA|EC|OPENSSH|DSA|PGP) PRIVATE KEY-----|xox[baprs]-[A-Za-z0-9-]{10,}|[Pp]assword\s*[:=]\s*[^\s]+|[Aa]pi[_-]?[Kk]ey\s*[:=]\s*[^\s]+|[Ss]ecret\s*[:=]\s*[^\s]+)' $(cat /tmp/all_revs.txt)
```

No output means no matches for those common secret patterns.
