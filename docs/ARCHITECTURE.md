# Frontend architecture

## Dependency direction

```text
index.js
  -> app (routing, theme, bootstrap)
      -> feature pages and feature components
          -> feature models and services
              -> shared controls, hooks and utilities
                  -> browser and React libraries
```

Feature code does not import prototype fixtures. `applicationRuntime.js` dynamically imports the mock adapter only for a development build with `REACT_APP_USE_MOCKS=true`. A production build creates `cashCollectionApi`, loads `/bootstrap`, validates the response, and stops with a retryable error if the backend contract is incomplete.

## Responsibilities

- `app/` owns composition, the Ant Design theme, hash routes and the loading/error boundary.
- `features/cashCollection/pages/` owns screen composition.
- `features/cashCollection/components/` groups reusable UI by business concern: home queue, patient lookup, tariffs, payment, dialogs, printing and workflow forms.
- `features/cashCollection/model/` contains calculations and workflow routing with no network access.
- `features/cashCollection/services/` describes the backend operations consumed by the UI.
- `services/httpClient.js` owns JSON envelopes, cookies, query encoding, timeouts and normalized API errors.
- `contracts/` validates backend bootstrap data before it reaches components.
- `mocks/` is a replaceable development adapter and cannot be loaded by production builds.

## Runtime state

The backend remains authoritative for patient eligibility, available workflows, dropdown values, tariff prices, payment restrictions, POS terminals, totals, bill numbers and printable output. The browser carries opaque IDs and versions back to the server. Before posting, Spring Boot must re-read all financial and eligibility inputs in one transaction.

Pending requests use server-side search, filtering, sorting and pagination. The UI requests ten rows at a time, which keeps the browser workload bounded when the queue contains tens of thousands of records. The authenticated server resolves the current hospital, counter and user; clients never submit trusted counter ownership.

## Routing

`HashRouter` provides these stable entry points:

- `/#/cash-collection`
- `/#/overview`
- `/#/reports`
- `/#/estimates`

Feature drill-down state remains local because it contains loaded patient/request versions that should be discarded on a full reload.
