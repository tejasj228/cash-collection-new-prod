# HBIMS Cash Collection

Production-oriented Create React App frontend for the HBIMS cash-collection
counter. Runs today against an in-memory mock backend; a real Spring Boot
service is not built yet.

## Run locally

```bash
npm install
npm start
```

Opens on `http://localhost:3000` with the mock backend (`REACT_APP_USE_MOCKS=true`
in `.env.development` — nothing else to configure).

```bash
npm test
npm run build     # production bundle; requires the real backend at runtime
npm run format
```

## Documentation

- **[`docs/PROJECT_GUIDE.md`](docs/PROJECT_GUIDE.md)** — start here. Full
  architecture, folder-by-folder structure, environment variables, how data
  flows through the app, every screen mapped to its code, and a complete
  step-by-step guide to building the real backend and connecting it to the
  legacy HBIMS system.
- **[`docs/api/`](docs/api/README.md)** — one file per API endpoint with the
  exact field names and example request/response JSON every screen needs.
- **[`contracts/openapi.yaml`](contracts/openapi.yaml)** — the same contract
  as a machine-readable OpenAPI 3.0.3 spec.

## Runtime configuration

Set at build time (`.env.*`) or at deploy time, before the bundle loads:

```html
<script>
  window.HBIMS_CASH_COLLECTION_CONFIG = {
    apiBaseUrl: "/api/cash-collection",
    credentials: "include",
    requestTimeoutMs: 30000,
  };
</script>
```

Routes are hash-based (`/#/cash-collection/collection`,
`/#/cash-collection/overview`), so the hosting server needs no SPA rewrite
rules.
