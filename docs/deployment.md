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
