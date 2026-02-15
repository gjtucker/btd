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
- `BASE_PATH` is set to `/${{ github.event.repository.name }}/`, which is correct for project pages like:
  - `https://<user>.github.io/<repo>/`

## 3) Trigger first deployment

- Push a commit to `main`, or
- Run **Actions → Deploy to GitHub Pages → Run workflow** manually.

After the workflow finishes, your site URL is available in:

- **Actions** run summary (`github-pages` environment URL), and
- **Settings → Pages**.

## 4) Common adjustments

### Custom domain

If you move to a custom domain, update base path behavior:

- For custom domain roots, base is often `/`.
- Update `BASE_PATH` in `.github/workflows/deploy-pages.yml` to match your hosting path.

### User/organization site repo

If the repo name is `<user>.github.io`, deploy URL is root and base path should typically be `/`.

## 5) Troubleshooting checklist

- Workflow must succeed on `main`.
- Pages source must stay set to **GitHub Actions**.
- If assets 404, base path likely does not match the actual URL path.
- If deployment is blocked, check repository visibility and branch protections affecting Actions.
