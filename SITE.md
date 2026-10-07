# nirberko site

This repo is both your GitHub profile (README.md) and a static site on GitHub Pages.
The site is live at https://nirberko.github.io/nirberko/ (or your custom domain once you add one). The home page lists every HTML page in `p/`.
There's no server, database or password: your GitHub login is the admin panel.

## Add a page

1. Export your artifact as an `.html` file. Give it a short, URL-friendly name, for example `cleveland-rental-atlas.html`.
2. Put it in the `p/` folder and push. On github.com you can do this with **Add file → Upload files**.
3. About a minute later it's live at `https://<your-domain>/p/<file-name>` and listed on the home page.

The home page reads each page's `<title>` and `<meta name="description">`. To change what a tile says,
add tags, reorder, or hide a page (its link keeps working), edit `pages.config.json`:

```json
"my-page": { "title": "Better title", "description": "One line about it", "tags": ["Topic"], "order": 1, "hidden": false }
```

Every page gets a small "← Nir Berko" back button in the top-right corner, added during the build (your HTML files are not changed).
To leave it off a page, set `"backButton": false` for that page in `pages.config.json`.

To remove a page, delete its file from `p/` and push. To change your name, tagline or links, edit `site.json`.

## Preview locally

```bash
node scripts/build.mjs   # writes _site/ and pages.json
npx serve _site          # open http://localhost:3000
```

## First-time setup

1. This repo deploys from the `master` branch.
2. In the repo, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
   Every push to `master` runs `.github/workflows/deploy.yml`, which builds and publishes the site.

### Custom domain

This site deploys with GitHub Actions, so GitHub ignores a `CNAME` file. The domain is set in the repo settings.

1. At your domain registrar, add DNS records:
   - Apex domain (`example.com`): four `A` records pointing to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`.
     Optionally add `AAAA` records `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`,
     and a `CNAME` for `www` pointing to `nirberko.github.io`.
   - Subdomain (`research.example.com`): one `CNAME` record pointing to `nirberko.github.io` (no `/nirberko` path).
   - On Cloudflare, set these records to "DNS only" (grey cloud) until GitHub has issued the HTTPS certificate.
2. In the repo, go to **Settings → Pages → Custom domain**, enter the domain and save. Wait for the DNS check to pass.
3. Once the certificate is ready (minutes to about an hour), tick **Enforce HTTPS**.
4. Optional but recommended: verify the domain under your GitHub account's **Settings → Pages → Add a domain**,
   so nobody else can point a GitHub Pages site at it.

## How it works

- `index.html` + `app.js` – the home page, React 19 loaded from esm.sh (no build step, no npm install).
- `scripts/build.mjs` – copies the site into `_site/` and generates `pages.json` from the files in `p/`
  (dates come from git history), and injects the back button into each page.
- `.github/workflows/deploy.yml` – runs the build and deploys to GitHub Pages on every push to `master`.
