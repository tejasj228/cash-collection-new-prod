# Project structure — HBIMS Cash Collection frontend

A complete, file-by-file walkthrough of this repository: what every folder is
for, what every file does, and how the pieces connect at runtime.

> This document describes the code as it currently stands. Some older notes in
> `docs/` still mention entry files (`src/main.jsx`, `src/hbims-entry.jsx`,
> `src/prototypeData.js`) from an earlier layout; the real entry point today is
> `src/index.js` → `src/app/App.jsx`, and fixtures live under `src/mocks/`.

---

## 1. What this app is

A **Create React App (CRA)** single-page frontend for the "cash collection"
desk of HBIMS (a hospital billing system). A counter clerk uses it to:

- work a **queue of pending billing requests** and collect or refund against them,
- run a **direct collection** for a patient (no pre-existing request),
- build an **estimate** (a printable tariff preview that takes no money),
- settle an **IPD final bill**,
- take payment by **Cash / Card / UPI / Cheque**, including a **POS terminal**
  flow with polling and a manual-entry fallback,
- print a **receipt / bill slip**,
- view an **Overview** dashboard (today's collections, refunds, a payment-mode
  donut, recent transactions) and a **Reports** screen (date-range totals,
  per-mode breakdown, an exportable register).

The backend is a **Spring Boot REST service** (contract in
`contracts/openapi.yaml`). It is authoritative for eligibility, prices, totals,
document numbers, payment state and printable data. The browser only carries
opaque IDs/versions back to the server.

For local design review there is a **prototype adapter** that serves in-memory
fixtures instead of the network. It is only ever loaded in a development build
with `REACT_APP_USE_MOCKS=true` and is dynamically imported so it never ships in
a production bundle.

---

## 2. Tech stack

| Concern           | Choice                                                                                                                                                                      |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework / build | React 19 + `react-scripts` 5 (CRA), Webpack under the hood                                                                                                                  |
| Routing           | `react-router-dom` v7, **`HashRouter`** (so it can mount under any legacy path with no server rewrite rules)                                                                |
| UI primitives     | **Ant Design v6** (`Button`, `Select`, `DatePicker`, `Input`, `ConfigProvider`) + `@ant-design/icons`                                                                       |
| Dates             | `dayjs` (used by the Ant `DatePicker`)                                                                                                                                      |
| Styling           | Hand-written CSS in `src/styles/*.css` (no CSS-in-JS, no Tailwind)                                                                                                          |
| Tests             | Jest + React Testing Library (CRA preset)                                                                                                                                   |
| Formatting        | Prettier (`npm run format`)                                                                                                                                                 |
| State             | Local React state only. One read-model is injected through a context; drill-down state is deliberately component-local so a reload discards stale patient/request versions. |

---

## 3. Top-level layout

```text
CASH_COLL_PRODUCTION/
├── public/                     static shell served as-is
├── src/                        all application source
│   ├── index.js                CRA entry — mounts <App/>
│   ├── app/                    composition: routing, theme, providers, bootstrap
│   ├── config/                 deployment-time configuration
│   ├── contracts/              the canonical frontend data contract + validators
│   ├── services/               transport + runtime wiring (HTTP client, runtime resolver)
│   ├── features/
│   │   └── cashCollection/     the entire feature (pages, components, models, API adapter)
│   ├── mocks/                  DEV-ONLY fixture data + fake service adapter
│   ├── shared/                 reusable controls, hooks, formatters
│   └── styles/                 global + feature stylesheets
├── contracts/openapi.yaml      the Spring Boot REST contract (source of truth for the API)
├── docs/                       architecture + backend-integration notes
├── .claude/launch.json         dev-server launch config for the Claude Code browser preview
├── package.json                scripts + dependencies
├── .env.development            REACT_APP_USE_MOCKS=true
├── .env.production             REACT_APP_USE_MOCKS=false
├── .env.example                documents the supported env vars
├── README.md                   quick start + runtime configuration
└── build/                      generated production bundle (git-ignored)
```

**Dependency direction (never violated):**

```text
index.js
 └─ app/ (routing, theme, bootstrap)
     └─ feature pages
         └─ feature components
             └─ feature models & services
                 └─ shared controls, hooks, utils
                     └─ React / browser / antd
```

Feature code **never imports `src/mocks/`**. Only `src/services/applicationRuntime.js`
does, and only behind a compile-time `process.env` check.

---

## 4. Root files

| File                | Purpose                                                                                                                                                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`      | Scripts (`start`, `build`, `test`, `format`, `format:check`, `eject`), dependency pins, `browserslist`, `eslintConfig` (`react-app` preset). `"homepage": "."` makes the build use relative asset paths so it can be served from any sub-path. |
| `package-lock.json` | Exact dependency tree.                                                                                                                                                                                                                         |
| `.env.development`  | Loaded by CRA for `npm start`. Sets `REACT_APP_USE_MOCKS=true` so the prototype adapter is used.                                                                                                                                               |
| `.env.production`   | Loaded for `npm run build`. `REACT_APP_USE_MOCKS=false` — production always calls the real backend and fails visibly if it is missing.                                                                                                         |
| `.env.example`      | Reference list of env vars: `REACT_APP_API_BASE_URL`, `REACT_APP_REQUEST_TIMEOUT_MS`, `REACT_APP_USE_MOCKS`.                                                                                                                                   |
| `.gitignore`        | `node_modules/`, `build/`, local env files, debug logs.                                                                                                                                                                                        |
| `README.md`         | How to run, how to inject `window.HBIMS_CASH_COLLECTION_CONFIG` at deploy time, the hash-route entry points, and a short structure summary.                                                                                                    |

### Environment variables

| Var                            | Default                | Effect                                                        |
| ------------------------------ | ---------------------- | ------------------------------------------------------------- |
| `REACT_APP_API_BASE_URL`       | `/api/cash-collection` | Base URL for all REST calls.                                  |
| `REACT_APP_REQUEST_TIMEOUT_MS` | `30000`                | Per-request abort timeout.                                    |
| `REACT_APP_USE_MOCKS`          | `false`                | `true` (dev only) → load `src/mocks/` instead of the network. |

All three can also be overridden **at deploy time** (without rebuilding) by
setting `window.HBIMS_CASH_COLLECTION_CONFIG` before the bundle loads — see
`public/runtime-config.js` and `src/config/runtimeConfig.js`.

---

## 5. `public/` — the static shell

| File                       | Purpose                                                                                                                                                                                                   |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/index.html`        | The HTML CRA injects the bundle into. Has `<div id="root">`, a `<noscript>` message, `theme-color`, and **loads `runtime-config.js` before the bundle** so deploy-time config is available synchronously. |
| `public/runtime-config.js` | One line: `window.HBIMS_CASH_COLLECTION_CONFIG = window.HBIMS_CASH_COLLECTION_CONFIG                                                                                                                      |     | {}`. The hosting environment (JSP page, reverse proxy, etc.) replaces or augments this file to point the frontend at a real API base URL, credentials mode, and timeout. |

---

## 6. `src/index.js`

CRA entry point. Imports the global stylesheets **in order**
(`antd/dist/reset.css` → `styles/cashCollection.css` → `styles/application.css`),
then mounts `<App/>` inside `<React.StrictMode>` into `#root`.

---

## 7. `src/app/` — application composition

Everything here is "wiring": routing, theme, the data provider, and the
load/error boundary. No business logic.

| File                                     | Purpose                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/App.jsx`                            | Root component. Wraps the tree in antd's `<ConfigProvider theme={antdTheme}>` and a `<HashRouter>`, then renders `<AppRoutes/>`.                                                                                                                                                                                                                                                                  |
| `app/routes/AppRoutes.jsx`               | The route table. `/cash-collection/collection/*`, `/cash-collection/overview` and `/cash-collection/reports` all render `<ApplicationBootstrap/>`. Legacy URLs (`/cash-collection`, `/overview`, `/reports`, `/estimates`, `/`, and `*`) `<Navigate replace>` to the canonical collection route.                                                                                                  |
| `app/providers/ApplicationBootstrap.jsx` | The **load/error boundary**. On mount it calls `resolveApplicationRuntime()`. While pending it shows the branded `<Loader/>` (the `application-state` screen). On failure it shows an antd `<Alert>` with a **Retry** button. On success it renders `<CashCollectionApplication data=… integration=…/>`.                                                                                          |
| `app/providers/AppDataProvider.jsx`      | A tiny React context. `<AppDataProvider value={appData}>` at the app root; `useAppData()` anywhere below returns the normalized read-model (patients, requests, tariffs, payment options, `todayIso`, `facility`, …). Throws a clear error if used outside the provider.                                                                                                                          |
| `app/theme/antdTheme.js`                 | The frozen antd theme object passed to `ConfigProvider`. Sets `colorPrimary` (`#49b2f3`, the sky-blue used across the app), border radius, control-item hover/active tints, popup shadow, motion duration/easing, and per-component tokens for `Button`, `Input`, `Select`, `DatePicker`, `Table`. This is what makes Ant's `Select` dropdown and `DatePicker` calendar match the rest of the UI. |

---

## 8. `src/config/runtimeConfig.js`

Builds one frozen `runtimeConfig` object by merging, in priority order:

1. `window.HBIMS_CASH_COLLECTION_CONFIG` (deploy-time),
2. `process.env.REACT_APP_*` (build-time),
3. hard defaults.

Exposes `apiBaseUrl`, `credentials` (`"include"` by default — send cookies),
`requestTimeoutMs`, and `useMocks` (only ever `true` in a dev build with the env
flag set).

---

## 9. `src/contracts/cashCollection.contract.js`

The **frontend's canonical data contract**. Nothing downstream matches loose
strings; everything branches on these enums.

| Export                                   | What it is                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WorkflowFamily`                         | Frozen map of the nine workflow kinds carried in each billing option's `uiFamily` (`tariff-entry`, `service-refund`, `account-payment`, `package-entry`, `package-refund`, `bill-settlement`, `bill-settlement-refund`, `advance-refund`, `part-payment-refund`). The UI switches layout on these.                                                                                                                                                                                                                                                                                                                                                             |
| `RequestChargeType`                      | Frozen map of the "Charge Type" values a queue request can carry (`OPD Service`, `OPD Refund`, `IPD Advance Deposit`, `IPD Advance Refund`, `IPD Final Adjustment`, `Investigation Charges`, `Package Collection`).                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `REFUND_REQUEST_CHARGE_TYPES`            | The subset of the above that are refunds.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `normalizeCashCollectionData(input)`     | **Structural validator + freezer.** Verifies every required array exists (`serviceOptions`, `patients`, `requests`, `tariffGroups`, `tariffCatalog`, `collectionModes`, `recentTransactions`, `recentEstimates`), that `todayIso` is `YYYY-MM-DD`, that `billingByService` has `Receipt` / `Refund` / `Estimation` option lists for every service, and that each option carries `id`, `label`, `processingServiceId`, `uiFamily`, `legacyMode`. Throws a precise error otherwise. Returns a frozen model with `paymentOptions` defaulted. Runs against **both** the prototype fixtures and the real `/bootstrap` response, so the UI only ever sees one shape. |
| `CASH_COLLECTION_SERVICE_METHODS`        | The 16 method names the service adapter must implement.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `assertCashCollectionServices(services)` | Throws if any of those 16 methods is missing — used on the production path so an incomplete backend fails loudly at startup.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

---

## 10. `src/services/` — transport + runtime wiring

| File                             | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `services/httpClient.js`         | The low-level fetch wrapper. `createHttpClient({ baseUrl, credentials, timeoutMs })` returns `{ request(path, { method, query, body, headers }) }`. It builds the URL, drops empty query params, sends cookies, sets JSON headers, aborts on timeout via `AbortController`, unwraps the `{ success, data, error, requestId }` envelope, and throws a typed **`ApiError`** (`code`, `status`, `fieldErrors`, `requestId`) on any non-OK / `success:false` response. Timeouts become `ApiError("…too long…", { code: "REQUEST_TIMEOUT" })`.     |
| `services/applicationRuntime.js` | **The one place that decides mock vs real.** `resolveApplicationRuntime()`: if `NODE_ENV === "development"` **and** `runtimeConfig.useMocks`, it `import()`s `mocks/prototypeData` + `mocks/prototypeServices` (dynamic import → tree-shaken out of production) and returns `{ data, integration: { mode: "prototype", services, events } }`. Otherwise it creates `cashCollectionApi(runtimeConfig)`, asserts all 16 methods exist, calls `loadBootstrap()`, normalizes it, and returns `{ data, integration: { mode: "spring-boot", … } }`. |
| `services/legacyHbimsBridge.js`  | **Migration reference only — not on any live path.** Constants and a `createIntegrationContext()` factory describing how the old HBIMS Struts/JSP host would inject a context path, the `CashCollectionOfflineTransBSCNT.cnt` action endpoint, request-mode codes (`OFFRECSER` / `OFFREFUNDSER` / `OFFESTIMATION`), the processing-service alias `35 → 21`, and which session attributes stay server-authoritative. New code ignores this and calls Spring Boot.                                                                              |

---

## 11. `src/features/cashCollection/` — the feature

Self-contained. Everything the cash-collection screen needs lives here.

### 11.1 `CashCollectionApplication.jsx` — the feature root / state machine

Receives `{ data, integration }` from the bootstrap boundary. Normalizes the
data once, then owns **all cross-screen state**: current `stage`
(`home` | `setup` | `workspace` | `overview` | `reports` | `confirmation`),
collection `mode` (`request` | `direct`), the chosen hospital service, request
type, selected patient / selected request, resolved workflow context, a toast,
a `busy` overlay flag, and the collapsed/expanded nav state (persisted to
`localStorage`).

Key handlers:

- `openRequest(request)` — the queue "Collect / Refund" click. Shows the
  full-screen `<LoaderOverlay/>`, calls `getRequest` then `checkEligibility`
  through `integration.services`, resolves service + workflow via
  `REQUEST_CHARGE_TYPE_ROUTES`, and moves to `stage: "workspace"`.
- `chooseService`, `changeMode`, `startEstimate`, `continueSetup`,
  `resetHome`, `navigate` — the rest of the stage transitions.
- `confirm(transaction)` — fired after a successful post; notifies
  `integration.events.onTransactionConfirmed` and returns home.

Renders the shell: `<SideRail/>` + `<TopBar/>` + a `<main class="content">`
that conditionally renders one of the pages/screens, plus the toast and the
`busy` overlay.

### 11.2 `pages/` — screen composition

| File                         | Screen                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pages/OverviewPage.jsx`     | The **Overview dashboard**. Three `StatCard`s (Collected / Refunds / Cash today) whose numbers **count up from 0** on load (`CountUp`), a hand-built SVG **donut chart** (`DonutChart`) that **assembles on mount** (arcs draw in staggered, the SVG fades/scales in, the centre total counts up, legend rows stagger in), and a paginated, sortable, CR-searchable **Recent Transactions** table. Rows are typed `row-collect` / `row-refund`. Gated by `useFakeLoad()` (shows the page loader for ~1s in the prototype).                                                               |
| `pages/ReportsPage.jsx`      | The **Reports** screen. A sliding **Collections / Refunds** segmented switch, a filter row with two Ant **`DatePicker`s** and a **`Select`** for payment mode, a **Gross − Refunds = Net** balance strip (all three count up), a **Collection by Payment Mode** grid where each card's progress bar **grows from 0** on load, and a sortable **Transaction Details** register with a **CSV export** (`exportCsv` builds a spreadsheet-safe CSV and triggers a download). Contains the local `ReportDateField` wrapper around the Ant `DatePicker`. Imports its own `styles/reports.css`. |
| `pages/ConfirmationPage.jsx` | The post-transaction **"Collection Confirmed"** screen: an animated success check, a receipt-summary card (bill no., patient, amount, payment mode), and **Print** / **New collection** actions.                                                                                                                                                                                                                                                                                                                                                                                         |

### 11.3 `components/` — UI grouped by business concern

| Folder / file                                     | Responsibility                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/layout/Navigation.jsx`                | `SideRail` (the left nav: an animated hamburger↔X toggle, a sliding white "active" pill that moves between Collection / Overview / Reports, collapse/expand) and `TopBar` (the breadcrumb).                                                                                                                                                                                                                                                                                                                                                                                   |
| `components/layout/Navigation.test.jsx`           | Tests for the rail: renders the items, marks the active one, fires `onNavigate`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `components/home/HomeComponents.jsx`              | The home screen building blocks: **`ModeTabs`** (the "Request-Based / Direct Collection" **sliding segmented switch**), **`RequestWorklist`** (the "Pending Requests" panel — server-driven search / filter popover / sort / 10-row pagination, skeleton rows while loading, typed `row-collect` / `row-refund` rows, "Collect / Refund" actions), **`DirectSelector`** (the service-picker card grid), and **`EstimatesHome`** (recent-estimates list + "Create Estimate").                                                                                                  |
| `components/patient/PatientComponents.jsx`        | **`PatientSearchPopover`** (modal CR-number lookup / "existing patients" list, animated open/close), **`DirectSetup`** (the direct-collection setup form: CR entry, patient selection, transaction type + billing service, eligibility check, "Continue"), and **`PatientBanner`** (the identity strip shown above the workspace).                                                                                                                                                                                                                                            |
| `components/workspace/CollectionWorkspace.jsx`    | The **workspace container** shown once a request/patient is chosen. Owns the line items, payment mode, the idempotency key, and `postAndPrint(payment)` — which builds the post command, calls `services.postTransaction`, validates the authoritative response (document number, printable data, total), sets up `<PrintableBill/>`, calls `window.print()`, then `onConfirm`. Renders either `<AccountWorkflowBuilder/>` or `<ChargeBuilder/>` (by workflow family) plus `<PaymentCard/>`, and the `<TariffDetailsDialog/>` when an IPD-final-adjustment group is expanded. |
| `components/workspace/AccountWorkflowBuilder.jsx` | The form for **account-style** workflows (account payment, bill settlement, advance/part-payment refund). Renders the "…Details" header selects (Department, Episode, Patient Category, Ward Type, Ward Name), and for a bill settlement the collapsible **Final Adjustment Details** table grouped by billing group, each row opening the tariff popup.                                                                                                                                                                                                                      |
| `components/charges/ChargeBuilder.jsx`            | The form for **tariff-entry** workflows (OPD service/refund, investigation, package). A group `Select` + a type-ahead tariff search that adds line items, then an editable charge table (qty, discount %, remove) with running gross / discount / net.                                                                                                                                                                                                                                                                                                                        |
| `components/payment/PaymentCard.jsx`              | The **payment panel**. Payment-mode select (with per-patient-category restrictions), and for Card/UPI the full **POS terminal** lifecycle: `initiateTerminalPayment` → poll `getTerminalPaymentStatus` with a 5-minute countdown → approved / failed, plus a **manual verified-details** fallback (`ManualPaymentDialog`). Opens `ConfirmDialog` before the final post. Cheque needs a description. Estimate mode hides payment entirely.                                                                                                                                     |
| `components/dialogs/Dialogs.jsx`                  | The three modal dialogs, all with animated open **and** close (`useModalClose`): **`TariffDetailsDialog`** (the legacy per-tariff popup for an IPD final adjustment group — fixed columns, its own scroll), **`ConfirmDialog`** (the "Confirm this collection?" step — confirm-only, no outside-click / Escape / Cancel dismissal, by product decision), and **`ManualPaymentDialog`** (bank / reference / card-last-4 / date entry for the terminal fallback, with calendar-date validation).                                                                                |
| `components/print/PrintableBill.jsx`              | A monospaced, fixed-width (94-col) **receipt/bill slip** rendered off-screen and revealed only by `@media print`. Pure text layout helpers (`padLeft`, `padRight`, `centreLine`) build the columns. Driven by the authoritative printable data from the post response.                                                                                                                                                                                                                                                                                                        |

### 11.4 `model/` — pure logic, zero network

| File                               | Purpose                                                                                                                                                                                                                                                                                              |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model/navigationRoutes.js`        | `CASH_COLLECTION_ROUTES` (the three canonical hash paths) and `sectionFromPath(pathname)` → `"collection"                                                                                                                                                                                            | "overview" | "reports"`. |
| `model/navigationRoutes.test.js`   | Tests the path → section mapping.                                                                                                                                                                                                                                                                    |
| `model/workflowRoutes.js`          | `isRefundRequest(request)` (charge-type in the refund set, or id starts with `REF`) and `REQUEST_CHARGE_TYPE_ROUTES` — the table mapping each `RequestChargeType` to a `{ serviceId, workflowFamily }` so `openRequest` can resolve which screen/workflow to open without string-matching free text. |
| `model/chargeCalculations.js`      | Line-item money math: `lineGross`, `lineDiscountPercent` (clamped 0–100), `lineDiscountAmount`, `lineNet` (never negative), and `withKeys(lines)` which stamps a stable `key`, `source: "request"`, `selected: true` onto server-supplied lines.                                                     |
| `model/chargeCalculations.test.js` | Tests the money math and clamping.                                                                                                                                                                                                                                                                   |
| `model/reportDates.js`             | `formatDateInput(value)` (progressive `DD/MM/YYYY` masking as the user types) and `isoFromDisplayDate(value)` (validates a real calendar date and returns `YYYY-MM-DD`, else `null`). Used by the Reports date fields.                                                                               |

### 11.5 `services/` — the backend adapter for this feature

| File                                 | Purpose                                                                                                                                                                                                                                                |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `services/cashCollectionApi.js`      | `createCashCollectionApi(config)` wraps `createHttpClient` and exposes all 16 contract methods, including server dashboard reads plus shift preparation, idempotent closure and same-day reopen. Each maps to a REST path in `contracts/openapi.yaml`. |
| `services/cashCollectionApi.test.js` | Tests URL/param/header construction against a stub fetch.                                                                                                                                                                                              |
| `services/idempotency.js`            | `createIdempotencyKey()` — `crypto.randomUUID()` when available, else 16 random bytes hex; throws if no secure RNG. One key is created per workspace session and sent with the post so a retry can't double-charge.                                    |

---

## 12. `src/mocks/` — development-only

Never imported by feature code; only `applicationRuntime.js` dynamically imports
it, and only in a dev build with the env flag.

| File                         | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mocks/prototypeData.js`     | ~1000 lines of **in-memory fixtures** shaped exactly like the normalized read-model: `serviceOptions`, `billingByService` (per service → per request-type → billing options), `patients`, `requests` (the queue), `tariffGroups`, `tariffCatalog`, `collectionModes` (donut colours), `recentTransactions`, `recentEstimates`, `paymentOptions` (modes, card types, POS terminals, category restrictions), plus `todayIso`, `facility`, `queueSummary`, `requestFilterOptions`. Exported as one frozen `PROTOTYPE_DATA`. |
| `mocks/prototypeServices.js` | `createPrototypeServices()` implements all 16 service methods over `PROTOTYPE_DATA`, including dashboard aggregation, cumulative shift segments and same-day reopen. **Every read/write method is wrapped in a fixed ~1s `withLatency()`** so the UI's loaders, skeletons and transitions are visible during a design review.                                                                                                                                                                                            |

---

## 13. `src/shared/` — reusable, feature-agnostic

### `shared/components/`

| File                        | Exports                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `components/ui.jsx`         | `Button` (thin wrapper over antd `Button` giving it `button button-<variant>` classes — `primary` / `soft` / `ghost`), `StatusPill`, `PageHeading`, `StatCard` (optionally counts up via `countValue` + `formatValue`), `SortHeader` (a sortable `<th>` with an arrow), plus the loading/animation primitives added for the polish pass: **`Loader`** (branded dual-ring + pulse spinner), **`LoaderOverlay`** (full-screen dim + card), **`SkeletonRows`** (shimmer table rows), and **`CountUp`** (animated number, wraps `useCountUp`). |
| `components/FormFields.jsx` | `SelectField` (label + antd `Select`, supports disabled options and a passthrough `className`) and `TextField` (label + borderless antd `Input`, with `mono`, `invalid`, `inputMode`, `maxLength` support). The single place select/input chrome is defined.                                                                                                                                                                                                                                                                               |
| `components/Icon.jsx`       | A self-contained inline-SVG icon set (`<Icon name="…" size=… strokeWidth=… />`). All icons are `currentColor` strokes drawn on a 24×24 grid, scaled by `size * 1.2`. No icon-font dependency.                                                                                                                                                                                                                                                                                                                                              |

### `shared/hooks/`

| File                        | Hook                                                                                                                                                                                                                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hooks/useSort.js`          | `useSort(initial)` → `[sort, toggle]` cycling a field `asc → desc → none`; plus `applySort(rows, sort, accessors)` for client-side sorting.                                                                                                                                                                         |
| `hooks/useEscapeToClose.js` | `useEscapeToClose(onClose, active=true)` — closes a dialog/popover on `Escape`.                                                                                                                                                                                                                                     |
| `hooks/useModalClose.js`    | `useModalClose(onClose, durationMs=200)` → `{ closing, requestClose }`. Lets a conditionally-mounted dialog play a **close** animation before the parent unmounts it: wire every dismiss path through `requestClose`, put `data-closing={closing}` on the backdrop, and the stylesheet reverses the open keyframes. |
| `hooks/useFakeLoad.js`      | `useFakeLoad(ms=1000)` — returns `true` for `ms` after mount, then `false`. Prototype-only: makes page-level loaders visible on screens whose data is already in memory (Overview, Reports).                                                                                                                        |
| `hooks/useCountUp.js`       | `useCountUp(target, { duration=850 })` — `requestAnimationFrame` ramp from 0 to `target` with `easeOutCubic`, re-running when `target` changes. Honours `prefers-reduced-motion` (jumps to the value).                                                                                                              |

### `shared/utils/formatters.js`

Small pure helpers used everywhere: `displayDate` (ISO → `DD/MM/YYYY`),
`amountOf` (strip commas → number), `money` (Indian-grouped 2-dp string),
`compactIdentifier` (strip whitespace from CR/bill numbers),
`optionValue` / `optionLabel` (read `{id,label}` objects or bare strings),
`firstContextValue` (first option value or a fallback).

---

## 14. `src/styles/` — stylesheets

| File                        | Scope                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `styles/application.css`    | App-shell + **global antd popup polish**. The Ant `Select` dropdown and `DatePicker` calendar render in a `document.body` portal (outside the app's root class), so their spacing/shadow/radius overrides live here unscoped.                                                                                                                                                                                                                                                                                                                       |
| `styles/cashCollection.css` | The large feature stylesheet (~6.4k lines). Root CSS variables (`--ink`, `--blue`, `--navy`, the shadow scale `--shadow-xs…lg`, `--ease-out`), then every panel/table/dialog/form/nav rule, then a big appended **polish block** at the end: soft elevation, restrained hover motion, the button "reflection" sheen, popup open/close keyframes, the sliding segmented switch, the sliding side-rail indicator, the animated hamburger, loaders/skeletons, the row-kind (`row-collect` / `row-refund`) tints, and a `prefers-reduced-motion` reset. |
| `styles/reports.css`        | Reports-page-only styles (imported directly by `ReportsPage.jsx`): the tab row, filter row, balance strip, payment-mode grid + its animated bars, and the register table. Also contains the antd `DatePicker` / `Select` sizing + focus-ring overrides for the filter row.                                                                                                                                                                                                                                                                          |

**Style load order** (`src/index.js`): `antd/dist/reset.css` → `cashCollection.css`
→ `application.css`; `reports.css` is imported by the Reports page component.

---

## 15. `contracts/openapi.yaml`

The **source of truth for the REST API**. OpenAPI 3.0.3, `servers: /api/cash-collection`,
session-cookie security. Defines the 16 operations, including dashboard,
pending-metric, transaction, POS and two-step shift-close endpoints. It also defines the
`{ success, data, error, requestId }` envelope, and every request/response
schema. The Spring Boot team generates interfaces or implements against this;
`cashCollectionApi.js` is the client half.

---

## 16. `docs/`

| File                                     | Contents                                                                                                                                                        |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/ARCHITECTURE.md`                   | Dependency direction, per-layer responsibilities, what stays server-authoritative, the routing table.                                                           |
| `docs/SPRING-BOOT-INTEGRATION.md`        | Suggested backend package layout and how to consume `openapi.yaml`.                                                                                             |
| `docs/LEGACY-HBIMS-INTEGRATION.md`       | The verified legacy Struts/JSP path that this frontend replaces.                                                                                                |
| `docs/LEGACY-HBIMS-BACKEND-REFERENCE.md` | Longer migration guide: counter/session rules, payloads, acceptance checklist. (Predates the current entry-file layout — treat file names in it as historical.) |
| `docs/PROJECT-STRUCTURE.md`              | This document.                                                                                                                                                  |

---

## 17. `.claude/`

| File                  | Purpose                                                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `.claude/launch.json` | Dev-server launch config (`npm start`, port 3000) used by the Claude Code in-app browser preview. Not part of the app. |

---

## 18. How a run actually flows

**Startup**

1. `public/index.html` loads `runtime-config.js`, then the bundle.
2. `src/index.js` mounts `<App/>` → `ConfigProvider` + `HashRouter` + `AppRoutes`.
3. The matched route renders `<ApplicationBootstrap/>`, which calls
   `resolveApplicationRuntime()`.
4. **Dev + mocks:** dynamic-import `prototypeData` + `prototypeServices`,
   normalize, done. **Production:** `createCashCollectionApi` → assert 16 methods
   → `GET /bootstrap` → `normalizeCashCollectionData` → done. On error, the
   boundary shows a Retry alert.
5. `<CashCollectionApplication data … integration …>` renders inside
   `<AppDataProvider>`; the shell (`SideRail` + `TopBar` + `content`) appears.

**A request-based collection**

1. Home → `RequestWorklist` calls `services.listPendingRequests({ page, size:10,
search, chargeType, department, sort })`; skeleton rows show while it runs.
2. Clerk clicks **Collect** → `openRequest(request)`: `LoaderOverlay` shows,
   `getRequest` + `checkEligibility` run, the service + `WorkflowFamily` are
   resolved from `REQUEST_CHARGE_TYPE_ROUTES`, `stage` → `workspace`.
3. `CollectionWorkspace` renders `PatientBanner` + (`AccountWorkflowBuilder`
   **or** `ChargeBuilder`) + `PaymentCard`.
4. `PaymentCard`: pick a mode; for Card/UPI run the POS terminal flow; open
   `ConfirmDialog`.
5. Confirm → `CollectionWorkspace.postAndPrint(payment)` builds the command
   (opaque IDs, versions, `idempotencyKey`), calls `services.postTransaction`.
6. The **server** re-reads eligibility/prices/totals in one transaction and
   returns the authoritative document number + printable data.
7. The response is validated, `PrintableBill` is populated, `window.print()`
   fires, `onConfirm` records the transaction and returns home.

---

## 19. Conventions worth knowing

- **Contract-first.** `contracts/openapi.yaml` and
  `src/contracts/cashCollection.contract.js` define the shape; both the mock and
  the real backend must satisfy `normalizeCashCollectionData`.
- **Mocks can't reach production.** They are only ever `import()`-ed behind a
  `process.env.NODE_ENV === "development"` check, so the production bundle never
  includes fixture chunks.
- **Server is authoritative** for money, eligibility, workflow availability,
  document numbers and printable output. The browser round-trips opaque IDs and
  versions only.
- **Idempotent posts.** One `Idempotency-Key` per workspace session guards
  against double submission.
- **Hash routing** so the app can mount under any path with no server rewrites;
  only three canonical routes, everything else redirects.
- **Drill-down state is local** to `CashCollectionApplication` and its children,
  so a full reload safely discards any stale patient/request version.
- **One place per concern:** selects/inputs → `FormFields.jsx`; icons →
  `Icon.jsx`; buttons/loaders/count-up → `ui.jsx`; money math →
  `chargeCalculations.js`; HTTP envelope/errors → `httpClient.js`.
- **Motion is centralised** in the polish block of `cashCollection.css` (plus
  `reports.css` for the bars) and every animation has a
  `prefers-reduced-motion` off-switch.

---

## 20. Commands

```bash
npm install         # install dependencies
npm start           # dev server on :3000 (uses prototype mocks)
npm test            # Jest + RTL, single run
npm run build       # production bundle into build/ (calls the real backend)
npm run format      # Prettier write
npm run format:check # Prettier check (CI)
```
