# Deployment notes

## Google OAuth origins
\- Keep the OAuth client’s **Authorized JavaScript origins** list up to date with every host that serves the storefront or admin UI:
  - `https://softupakaran.vercel.app`
  - `https://softupakaran-cf67l89wj-subash107s-projects.vercel.app`
  - `https://subash107.github.io/softupakaran/` (GitHub Pages)
  - Any preview, staging, or local host you test.
\- After saving the origin list, wait a minute and then refresh the browser before retrying Google sign‑in.

## Category synchronization
\- The frontend and backend both seed categories/pills, so keep them aligned by running the verifier before deployment:

```bash
node infrastructure/scripts/verify-categories-sync.js
```

\- The verifier checks:
  - Every entry in `services/frontend/js/app.js`’s `DEFAULT_CATEGORIES`, `CATEGORY_ORDER`, and `CATEGORY_NOTES` matches the rows seeded by `services/backend/scripts/update-sample-products.js`.
  - Additional categories aren’t silently added to one side without the other.
\- Failures print the mismatch details and exit with status `1`, making it easy to wire into CI or pre-release scripts.

## Catalog tiers, localization, and demo orders

- The curated Netflix catalog now brings richer metadata (tier, availability, USD pricing, Nepali notes) that mirror `services/backend/scripts/update-sample-products.js`. Update that script and re-run it whenever you tweak the sample catalog so the frontend and SQLite seed stay aligned.
- `services/frontend/js/app.js` holds the `LOCALES` dictionary, translates button text, and keeps the hero tagline, cart header, and modal labels in sync via `data-locale-text` hooks in `services/frontend/index.html`. The header language switch (`langSwitchWrap`/`langSwitch`) calls `setLocale`, so extend `LOCALES` and add more translation markers whenever you need another language.
- `services/frontend/styles.css` styles the language pill, hero tagline, and new demo-order notice so the UI still looks sharp on every screen size.
- The storefront now posts demo orders through `sendOrderToBackend`, `triggerDemoOrder`, and surfaces the backend order ID (plus the corresponding `services/backend/logs/order-<id>.json`) inside the cart modal. Use `node services/backend/scripts/demo-order.js` to replay the same POST payload from the CLI and confirm the API→UI→log loop.
- For your portfolio, capture a short screen recording or GIF showing the hero/catalog, language toggle, and demo order confirmation, and link it from the README/docs so recruiters can instantly see the workflow.

## Automation helpers

- **File uploader** – push a local image into the backend uploads folder (or any other multipart endpoint) with:

  ```bash
  node infrastructure/scripts/upload-file.js --file ./assets/esewa-qr-placeholder.svg \
    --url http://localhost:4000/api/admin/uploads/product-image \
    --admin-token "$ADMIN_TOKEN" \
    --form note="Local upload" \
    --debug
  ```

- **Database backup** – snapshot the SQLite file for safekeeping. Compress to gz with `--gzip`, override the source `--db-path`, or change the destination folder:

  ```bash
  node infrastructure/scripts/backup-db.js --gzip --out-dir infrastructure/backups
  ```

- **Folder watcher** – monitor frontend/backend sources and run a command whenever files change. Example that reruns lint when the frontend changes:

  ```bash
  node infrastructure/scripts/watch-folders.js --dirs services/frontend,services/backend --cmd "npm run lint" --debounce 600
  ```

- **Website deployer** – copy the static storefront into infrastructure artifacts (use `--clean` to remove the target first or `--pre`/`--post` to run hooks):

  ```bash
  node infrastructure/scripts/deploy-website.js --source services/frontend --target infrastructure/deployments/frontend --clean
  ```

- **PowerShell orchestrator** – wrap the helpers from one place (run backup+deploy, upload, or fire the watcher). Example combination:

  ```powershell
  powershell -ExecutionPolicy Bypass -File infrastructure/scripts/automation.ps1 `
    -Action all -BackupGzip -DeployClean -DeployPost "echo Ready"
  ```

  Use `-Action upload` with `-UploadFile` or `-Action watch` with `-WatchCmd` if you need a focused run.
