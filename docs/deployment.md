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
node scripts/verify-categories-sync.js
```

\- The verifier checks:
  - Every entry in `frontend/js/app.js`’s `DEFAULT_CATEGORIES`, `CATEGORY_ORDER`, and `CATEGORY_NOTES` matches the rows seeded by `backend/scripts/update-sample-products.js`.
  - Additional categories aren’t silently added to one side without the other.
\- Failures print the mismatch details and exit with status `1`, making it easy to wire into CI or pre-release scripts.
