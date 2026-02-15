# GitHub Pages setup guide

Use this checklist to publish this Vite app to GitHub Pages.

## 1) Confirm repository settings

1. Push your code to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Go to **Settings → Actions → General** and ensure workflow permissions allow pages deployment (default is fine for this repo because workflow permissions are explicitly set).

## 2) Verify the deploy workflow

This repo deploys from `.github/workflows/deploy-pages.yml`.

Key points:

- Deploy runs on pushes to `main`.
- Build output is `dist/`.
- Build uses a relative Vite `base` (`./`) by default so assets resolve correctly on project pages, user/org pages, and custom domains.

## 3) Trigger first deployment

- Push a commit to `main`, or
- Run **Actions → Deploy to GitHub Pages → Run workflow** manually.

After the workflow finishes, your site URL is available in:

- **Actions** run summary (`github-pages` environment URL), and
- **Settings → Pages**.

## 4) Common adjustments

### Custom domain

If you move to a custom domain, the default relative base usually works unchanged.

- If you need a specific path override, set `BASE_PATH` in the workflow build step.

## 5) Troubleshooting checklist

- Workflow must succeed on `main`.
- Pages source must stay set to **GitHub Actions**.
- If assets 404, verify `BASE_PATH` is not overriding the default relative base unexpectedly.
- If deployment is blocked, check repository visibility and branch protections affecting Actions.
