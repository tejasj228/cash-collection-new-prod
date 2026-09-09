# HBIMS Cash Collection

Production-oriented Create React App frontend for HBIMS cash collection. It uses Ant Design for application primitives, React Router's `HashRouter` for deployment below legacy application paths, and a typed-by-contract service boundary for a new Spring Boot backend.

## Run locally

```powershell
npm install
npm start
```

Development uses isolated prototype adapters when `REACT_APP_USE_MOCKS=true`. Production builds always call the configured backend and fail visibly if it is unavailable; mock fixtures are never a production fallback.

```powershell
npm test -- --runInBand
npm run build
```

## Runtime configuration

Set values at build time with `.env` or at deployment time before the bundle loads:

```html
<script>
  window.HBIMS_CASH_COLLECTION_CONFIG = {
    apiBaseUrl: "/api/cash-collection",
    credentials: "include",
    requestTimeoutMs: 30000,
  };
</script>
```

Routes use hashes, for example `/#/cash-collection`, `/#/overview`, and `/#/reports`, so the hosting server does not require SPA rewrite rules.

## Structure

```text
src/
  app/                    application composition, providers, routes and theme
  config/                 deployment-time configuration
  contracts/              canonical frontend data contract
  features/cashCollection feature pages, components, models and API adapter
  mocks/                  development-only fixture adapters
  services/               HTTP and runtime integration infrastructure
  shared/                 reusable controls, hooks and formatters
  styles/                 application and feature styles
contracts/openapi.yaml    Spring Boot REST contract
docs/                     architecture and backend integration notes
```

The legacy HBIMS browser bridge remains in `src/services/legacyHbimsBridge.js` only as migration reference. New production code calls Spring Boot REST endpoints through `cashCollectionApi.js`.

See [Architecture](docs/ARCHITECTURE.md) and [Spring Boot integration](docs/SPRING-BOOT-INTEGRATION.md).
