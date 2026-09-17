# HBIMS Cash Collection

Create React App frontend for the HBIMS cash-collection counter. The current
local integration loads the pending-request queue and patient tile from the
legacy HBIMS endpoints, including request tariff details; the remaining transaction, dashboard, and
shift operations still use prototype service implementations until their
real endpoints are delivered.

## Run locally

```bash
npm install
npm start
```

Open the app through the HBIMS launch URL so
`varSSOTicketGrantingTicket` reaches the frontend. The ticket is retained in
`sessionStorage` for that browser tab. A missing/expired ticket or failed
legacy call produces the bootstrap error screen; the app does not substitute
dummy pending requests.

```bash
npm test
npm run build
npm run format:check
```

## Documentation

- **[`docs/PROJECT_GUIDE.md`](docs/PROJECT_GUIDE.md)** — start here. Full
  architecture, folder-by-folder structure, runtime/session configuration, how data
  flows through the app, every screen mapped to its code, and a complete
  step-by-step guide to building the real backend and connecting it to the
  legacy HBIMS system.
- **[`docs/api/`](docs/api/README.md)** — one file per API endpoint with the
  exact field names and example request/response JSON every screen needs.
- **[`docs/api/18-patient-tile-STAGED.md`](docs/api/18-patient-tile-STAGED.md)**
  — active legacy patient-tile call and its target CR-number-only contract.
- **[`docs/api/19-request-tariff-details.md`](docs/api/19-request-tariff-details.md)**
  — single current-code reference for API-driven OPD/IPD tariff rendering,
  account/settlement context, eligibility gates, and Final Adjustment drill-down.
- **[`contracts/openapi.yaml`](contracts/openapi.yaml)** — the same contract
  as a machine-readable OpenAPI 3.0.3 spec.

## Runtime configuration

There are no `.env` files and no `window.*` runtime configuration object.
All API defaults, the local HBIMS backend origin, endpoint paths, SSO ticket
handling, User-Agent parameter, mode, and request helper live in
`src/utilities/sessionService.js`. The CRA development proxy imports its
backend origin from that same file.

Routes are hash-based (`/#/cash-collection/collection`,
`/#/cash-collection/overview`), so the hosting server needs no SPA rewrite
rules.
