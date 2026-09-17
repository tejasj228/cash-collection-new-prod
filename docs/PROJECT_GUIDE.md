# Cash Collection — complete project guide

**Read this if you know nothing about this codebase.** It is written so that a
person with no prior context — or an AI coding agent (Claude Code) working
from this file alone — can understand the whole system and build the missing
backend without having to read the source line by line first.

This is the **one master document**. A companion folder, [`docs/api/`](./api/README.md),
has one file per API endpoint with the exact field names and example JSON
every screen needs. Read this file first, then use `docs/api/` as a
reference while you implement each endpoint.

> Everything in this document was verified directly against the source in
> this repository on the date this was written. Where something in the code
> is unfinished, inconsistent, or prototype-only, that is called out
> explicitly in **§10 — Known gaps** rather than glossed over.

---

## Table of contents

1. [What this project is](#1-what-this-project-is)
2. [Quick start](#2-quick-start)
3. [Folder and file structure](#3-folder-and-file-structure)
4. [Runtime and session configuration](#4-runtime-and-session-configuration)
5. [How data flows through the app](#5-how-data-flows-through-the-app)
6. [Every screen and feature, mapped to code](#6-every-screen-and-feature-mapped-to-code)
7. [The mock backend (`src/mocks/`)](#7-the-mock-backend-srcmocks)
8. [Building the real backend](#8-building-the-real-backend)
9. [Connecting to the legacy HBIMS system](#9-connecting-to-the-legacy-hbims-system)
10. [Known gaps, dead code and prototype-only shortcuts](#10-known-gaps-dead-code-and-prototype-only-shortcuts)
11. [Commands](#11-commands)
12. [Acceptance checklist before go-live](#12-acceptance-checklist-before-go-live)
13. [If you are an AI agent building the backend from this doc](#13-if-you-are-an-ai-agent-building-the-backend-from-this-doc)

---

## 1. What this project is

A **Create React App** single-page frontend for the "Cash Collection" counter
at a hospital that runs **HBIMS** (Hospital Billing & Information Management
System — an existing, older Java/Struts/JSP/Oracle-PostgreSQL system). A
billing clerk uses this app to:

- work a **queue of pending billing requests** raised by wards/OPD/emergency,
  and collect or refund against them ("Request-Based Collection"),
- run a **walk-in collection** for a patient with no pre-existing request
  ("Direct Collection"),
- build a **printable estimate** that takes no money,
- settle an **IPD final bill** (grouped by Accommodation / Consultation /
  Investigation / Procedure / Pharmacy, etc.),
- take payment by **Cash / Card / UPI / Cheque**, including a simulated
  **POS terminal** flow (auto-polled) with a manual-entry fallback,
- print a receipt,
- watch a **live dashboard** (today's collected/refunded totals, payment-mode
  and patient-category/department breakdowns, an OPD/IPD/Emergency
  billing-service drill-down, an hourly collection chart, recent
  transactions with reprint/cancel), and
- **open and close a counter shift** with denomination-level cash
  reconciliation.

**The full backend does not exist yet.** Two legacy read endpoints are active
today: `pendinglist` supplies the request queue and `patinfo` supplies the
patient header. The remaining operations use the prototype service shell.
This document's main job (§8–§9) is to define what a complete backend must
implement and how it should talk to the existing HBIMS system underneath.

The intended production backend is a **Spring Boot REST service**. It is
authoritative for eligibility, prices, totals, document numbers, payment
state and printable output. The browser only ever carries opaque IDs and
version tokens back to the server — it never computes or trusts a price,
total, or permission on its own.

---

## 2. Quick start

```bash
npm install         # install dependencies
npm start           # dev server on http://localhost:3000, live pendinglist/patinfo required
npm test            # Jest + React Testing Library, single run
npm run build       # production bundle into build/
npm run format      # Prettier — writes src/**, contracts/**, docs/**, README.md, package.json
npm run format:check
```

Launch the app through HBIMS so the SSO ticket is present in the URL, or use
a tab whose `sessionStorage` already holds that ticket. Development bootstrap
always loads the live pending queue. If the ticket/backend fails, the UI shows
the retry/error screen; it never substitutes fixture patients.

---

## 3. Folder and file structure

```text
CASH_COLL_PRODUCTION/
├── public/
│   └── index.html               HTML shell
├── src/
│   ├── index.js                 CRA entry point — mounts <App/>
│   ├── app/                     composition only: routing, antd theme, bootstrap boundary
│   │   ├── App.jsx                 ConfigProvider(antd theme) > HashRouter > AppRoutes
│   │   ├── routes/AppRoutes.jsx    the 3 route patterns + every legacy-URL redirect
│   │   ├── providers/
│   │   │   ├── ApplicationBootstrap.jsx   calls resolveApplicationRuntime(), shows loader/retry/app
│   │   │   └── AppDataProvider.jsx        React context — useAppData() anywhere below it
│   │   └── theme/antdTheme.js      the frozen Ant Design theme object
│   ├── config/
│   │   └── runtimeConfig.js     typed view of constants exported by sessionService.js
│   ├── contracts/
│   │   └── cashCollection.contract.js   the canonical data-shape contract (see §5)
│   ├── services/                 transport + runtime wiring, feature-agnostic
│   │   ├── httpClient.js           fetch wrapper: envelope unwrap, timeout, ApiError
│   │   ├── applicationRuntime.js   development live-queue bridge / production REST switch
│   │   ├── legacyHbimsPendingRequests.js  raw pendinglist → internal queue rows
│   │   ├── legacyHbimsPatientInfo.js      raw patinfo → internal patient
│   │   └── legacyHbimsBridge.js    HBIMS constants for reference only — see §9, not on any live path
│   ├── features/cashCollection/  the entire feature — grouped by the screen or workflow each folder owns
│   │   ├── CashCollection/
│   │   │   ├── CashCollection.jsx/.css    feature shell, top navigation, cross-screen state and shared styles
│   │   │   └── cashCollection.js          shell constants
│   │   ├── Collection/
│   │   │   ├── RequestBased/              pending-request tabs, queue, search, filters and paging
│   │   │   │   └── RequestBased.jsx/.css + requestBased.js
│   │   │   └── Direct/                    service selection, patient search and direct setup
│   │   │       └── Direct.jsx/.css + direct.js
│   │   ├── CollectionDetails/
│   │   │   ├── CollectionDetails.jsx/.css + collectionDetails.js   shared workflow coordinator
│   │   │   ├── RequestBasedDetails/       request-backed workflow wrapper
│   │   │   ├── DirectDetails/             direct workflow wrapper
│   │   │   ├── PatientDetails/            patient banner and photo lightbox
│   │   │   ├── BillingDetails/            tariff, account, settlement and audit details
│   │   │   └── PaymentDetails/            modes, POS polling, manual fallback and posting
│   │   ├── Dashboard/                     KPIs, charts, filters, recent transactions and dashboard styles
│   │   │   ├── Dashboard.jsx/.css + dashboard.js
│   │   │   ├── DonutChart.jsx / MiniPie.jsx
│   │   │   └── ReportDateField.jsx
│   │   ├── Shift/
│   │   │   └── Shift.jsx/.css + shift.js  reconciliation, close/reopen dialogs and printable shift report
│   │   ├── Confirmation/
│   │   │   └── Confirmation.jsx/.css + confirmation.js   posting, terminal and result dialogs
│   │   ├── Print/
│   │   │   └── PrintableBill.jsx/.css + printableBill.js  print-only receipt
│   │   ├── model/                pure functions, zero network — the business-logic layer
│   │   │   ├── workflowRoutes.js     resolveRequestRoute(), isRefundRequest()
│   │   │   ├── navigationRoutes.js   CASH_COLLECTION_ROUTES, sectionFromPath()
│   │   │   ├── chargeCalculations.js lineGross/lineDiscountAmount/lineNet/withKeys — the money math
│   │   │   ├── shiftSummary.js       computeShiftSummary(), hourOf(), parseAmount() — reconciliation math
│   │   │   └── reportDates.js        date-mask/parse helpers + real-clock shift-timing helpers
│   │   └── services/              the feature's backend adapter (the REAL half, see §8)
│   │       ├── cashCollectionApi.js     createCashCollectionApi(config) — implements all 16 methods
│   │       ├── pendingRequestMapper.js  snake_case wire row → camelCase UI row (see docs/api/02)
│   │       ├── transactionRowMapper.js  same, for transaction rows (see docs/api/10)
│   │       ├── shiftApiModels.js        strict validators for shift-close responses
│   │       └── idempotency.js           createIdempotencyKey() — crypto.randomUUID() based
│   ├── mocks/                     DEV-ONLY. Never imported by feature code — see §7.
│   │   ├── prototypeData.js          ~1300 lines of in-memory fixtures
│   │   └── prototypeServices.js      fake implementation of all 16 service methods
│   ├── shared/                    reusable, feature-agnostic
│   │   ├── components/ui.jsx         Button, StatusPill, StatCard, SortHeader, Loader, LoaderOverlay,
│   │   │                            SkeletonRows, CountUp
│   │   ├── components/FormFields.jsx SelectField, TextField
│   │   ├── components/Icon.jsx       inline-SVG icon set, one <svg> per name, no icon font
│   │   ├── components/ConfirmModal.jsx  the shared modal base every dialog is built on
│   │   ├── hooks/                    useSort, useEscapeToClose, useModalClose, useFakeLoad, useCountUp
│   │   └── utils/formatters.js       displayDate, money, compactIdentifier, optionValue/Label, …
│   ├── utilities/
│   │   └── sessionService.js      sole API/session/backend/endpoint configuration source
│   └── styles/
│       └── application.css           app-shell + global antd popup polish (portal-rendered, unscoped)
├── contracts/openapi.yaml         OpenAPI 3.0.3 — the REST contract a Spring Boot backend implements
├── docs/
│   ├── PROJECT_GUIDE.md           this file
│   └── api/                       one file per endpoint — exact fields + example JSON (see §8)
├── .claude/launch.json            dev-server launch config for the Claude Code browser preview
├── package.json                   scripts + deps (see §11)
└── README.md                      short pointer at this file
```

**Dependency direction (never violate this when adding code):**

```text
index.js
 └─ app/            (routing, theme, bootstrap)
     └─ feature pages
         └─ feature components
             └─ feature model & services
                 └─ shared controls, hooks, utils
                     └─ React / browser / antd
```

Feature code **never imports `src/mocks/`** directly. Only
`src/services/applicationRuntime.js` does, and only behind a compile-time
`process.env.NODE_ENV === "development"` check, so Webpack strips the mock
code out of a production build entirely.

---

## 4. Runtime and session configuration

There are no `.env` files, `REACT_APP_*` switches, or
`window.HBIMS_CASH_COLLECTION_CONFIG` overrides. The single source is
`src/utilities/sessionService.js`, which owns:

- target REST base URL, cookie credentials policy, and timeout;
- local legacy backend origin and both legacy endpoint paths;
- SSO ticket query/storage keys, User-Agent, and `mode=1`;
- same-origin/local-proxy URL resolution and `fetchLegacyJson`.

`src/config/runtimeConfig.js` only exposes the REST constants in the shape
expected by `createCashCollectionApi`. `src/setupProxy.js` imports the local
backend origin from `sessionService.js`; it does not duplicate the IP.

HBIMS provides `varSSOTicketGrantingTicket` before the hash route. It is held
in memory plus `sessionStorage` (tab lifetime), never `localStorage`. Details:
[`docs/api/17-legacy-hbims-bridge-STAGED.md`](./api/17-legacy-hbims-bridge-STAGED.md).

---

## 5. How data flows through the app

### 5.1 The contract (`src/contracts/cashCollection.contract.js`)

This file is the single source of truth for **shape**. It exports:

- `WorkflowFamily` — 9 frozen strings (`tariff-entry`, `service-refund`,
  `account-payment`, `package-entry`, `package-refund`, `bill-settlement`,
  `bill-settlement-refund`, `advance-refund`, `part-payment-refund`). Every
  billing option carries one of these in its `uiFamily` field, and the UI
  picks which form component to render from it. **Never** match on labels or
  substrings to decide this — always branch on `uiFamily`.
- `HospitalService` — the 3 "Hospital Service" strings a pending-request or
  transaction row carries (`OPD`, `IPD`, `Emergency`). In HBIMS this is the
  charge-type family (`sblnum_chargetype_id`). It decides which service tile
  a queue request opens under (`resolveRequestRoute()` in
  `model/workflowRoutes.js`).
- `RequestType` — the 7 "Request Type" strings a pending-request row carries
  (`Service`, `Refund`, `Advance Deposit`, `Advance Refund`,
  `Final Adjustment`, `Investigation Charges`, `Package Collection`). It
  decides the workflow. The two together replaced the old single combined
  "Charge Type" column (`"IPD Final Adjustment"` → `IPD` + `Final Adjustment`).
  Do not confuse `requestType` on a _row_ with the `requestType` state /
  `request_type` command field, which is the `Receipt` / `Refund` /
  `Estimation` transaction kind.
- `HOSPITAL_SERVICE_FAMILY` / `HOSPITAL_SERVICE_FAMILIES` /
  `BILLING_SERVICE_BUCKET` / `BILLING_SERVICES_BY_FAMILY` — the **dashboard's
  own** OPD/IPD/Emergency → billing-service taxonomy (a _different_,
  simpler grouping than `RequestType` above, used only for the
  dashboard's billing-service breakdown cards). OPD and Emergency only ever
  have one bucket ("Service"); IPD has four ("Service", "Advance",
  "Part Payment", "Bill Settlement" — a billed "Package" folds into
  "Service" for this specific breakdown only).
- `normalizeCashCollectionData(input)` — a **structural validator**. It
  throws a specific error if any required array/field is missing or
  malformed. It runs against both the mock fixtures and a real `/bootstrap`
  response, so the rest of the app only ever sees one validated shape. **Any
  backend response that doesn't satisfy this function will crash the app on
  load with a visible error**, which is intentional — it's the guard against
  a half-implemented backend silently rendering broken data.
- `CASH_COLLECTION_SERVICE_METHODS` — the list of **16 method names** a
  service adapter (mock or real) must implement.
- `assertCashCollectionServices(services)` — throws listing exactly which of
  those 16 methods is missing.

### 5.2 Runtime selection (`src/services/applicationRuntime.js`)

```js
export async function resolveApplicationRuntime() {
  if (process.env.NODE_ENV === "development") {
    const [{ PROTOTYPE_DATA }, { createPrototypeServices }] = await Promise.all(
      [import("../mocks/prototypeData"), import("../mocks/prototypeServices")],
    );
    const services = createPrototypeServices();
    const liveRequests = await fetchLegacyPendingRequests();
    // Replace queue bootstrap/query/detail operations with live data.
    return {
      data: normalizeCashCollectionData({
        ...PROTOTYPE_DATA,
        requests: liveRequests,
        queueSummary: withLiveQueueSummary(...),
      }),
      integration: { mode: "legacy-hbims", services, events: {} },
    };
  }
  const services = assertCashCollectionServices(
    createCashCollectionApi(runtimeConfig),
  );
  const data = normalizeCashCollectionData(await services.loadBootstrap());
  return { data, integration: { mode: "spring-boot", services, events: {} } };
}
```

Development uses prototype implementations only as a shell for endpoints
that do not exist yet. The queue, count, request lookup, and patient header
are live and mandatory. Live fetch failures reject bootstrap instead of
falling back to `PROTOTYPE_DATA.requests`. Production uses the target REST
adapter with constants supplied by `sessionService.js`.

### 5.3 Bootstrap → render

1. `public/index.html` loads the JS bundle; no runtime-config script exists.
2. `src/index.js` mounts `<App/>` → `ConfigProvider`(antd theme) → `HashRouter` → `AppRoutes`.
3. The matched route renders `<ApplicationBootstrap/>`, which calls `resolveApplicationRuntime()` on mount.
4. While pending: a branded full-screen `<Loader/>`. On failure: an antd `<Alert>` with a **Retry** button — nothing crashes silently.
5. On success: `<CashCollectionApplication data={...} integration={...}/>` renders inside `<AppDataProvider value={data}>`. Everything below can call `useAppData()` to read the bootstrap read-model, and reaches the service adapter via the `integration` prop threaded down by `CashCollectionApplication`.

### 5.4 State ownership

`CashCollection/CashCollection.jsx` is a **big, deliberately centralized state
machine** — not Redux, not a second Context, just React state at the top of
the feature. It owns: the current `stage` (`home` | `setup` | `workspace` |
`dashboard` | `confirmation`), collection `mode` (`request` | `direct`), the
chosen hospital service, request type, selected patient/request, resolved
workflow context, toasts, a `busy` overlay flag, all shift-lifecycle state
(`shiftOpenedAt`, `shiftClearedAt`, `shiftPreparation`, `shiftSnapshot`, the
restart-shift dialog state), and bill-level client patches (`txPatches`, used
only for the client-only Cancel-bill action — see §10).

Drill-down/local UI state (which dashboard card is expanded, which dialog is
open) is deliberately kept **local** to the component that owns it, so a full
page reload safely discards any stale patient/request version rather than
resurrecting it from a global store.

---

## 6. Every screen and feature, mapped to code

| Feature (what a clerk sees)                                                                                                            | Where it lives                                                                                                                                                                     | Backend calls it makes                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Pending Requests queue (search, filter panel, sort, 10-row pages)                                                                      | `Collection/RequestBased/RequestBased.jsx` → `RequestWorklist`                                                                                                                     | `listPendingRequests(filters)`                                                                                                                |
| Direct Collection service tiles                                                                                                        | `Collection/Direct/Direct.jsx` → `DirectSelector`                                                                                                                                  | none (services come from bootstrap)                                                                                                           |
| Direct Collection setup (CR lookup, existing-patient list for IPD, transaction type, billing service)                                  | `Collection/Direct/Direct.jsx` → `DirectSetup`                                                                                                                                     | `checkEligibility(context)` before continuing                                                                                                 |
| Patient search / existing-patient popover                                                                                              | `Collection/Direct/Direct.jsx` → `PatientSearchPopover`                                                                                                                            | `searchPatients(query)` (bootstrap's `patients` array is also filtered client-side today — see §10)                                           |
| Compact patient identity banner (CR, admission number, age/sex, category, mobile, ABHA)                                                | `CollectionDetails/PatientDetails/PatientDetails.jsx` → `PatientBanner`, `PatientPhotoLightbox`                                                                                    | Patient Tile API 18 by CR number; IPD shows the admission number and OPD shows `-`                                                            |
| Tariff Details / building a bill, live tariff search, discounts                                                                        | `CollectionDetails/BillingDetails/BillingDetails.jsx`                                                                                                                              | Request Tariff Details API 19 supplies opened-request lines for both OPD and IPD; `getTariffs(filters)` searches the addable tariff catalogue |
| IPD Advance / Package / Part Payment / Bill Settlement forms                                                                           | `CollectionDetails/BillingDetails/BillingDetails.jsx`                                                                                                                              | API 19 returns the IPD-only Department, Episode, Patient Category, Ward Type, and Ward Name context                                           |
| Per-line settlement audit popup ("Details" icon)                                                                                       | `CollectionDetails/BillingDetails/BillingDetails.jsx` → `TariffDetailsDialog`                                                                                                      | Renders the authoritative tariff line/detail data from API 19                                                                                 |
| Estimates (Transaction Type = Estimation)                                                                                              | Runs through `DirectSetup` + `ChargeBuilder` + `PaymentCard` like any other transaction — **not** the separate `EstimatesHome`/`stage: "estimates"` path, which is dead code (§10) | `checkEligibility`, then `postTransaction` with `requestType: "Estimation"`                                                                   |
| Payment (Cash/Cheque)                                                                                                                  | `CollectionDetails/PaymentDetails/PaymentDetails.jsx`                                                                                                                              | `postTransaction(command)`                                                                                                                    |
| Payment (Card/UPI) — POS terminal, auto-polled, manual fallback                                                                        | `CollectionDetails/PaymentDetails/PaymentDetails.jsx` + `Confirmation/Confirmation.jsx` → `ManualPaymentDialog`                                                                    | `initiateTerminalPayment`, `getTerminalPaymentStatus` (polled every 10s), then `postTransaction`                                              |
| Printed receipt/bill                                                                                                                   | `Print/PrintableBill.jsx`                                                                                                                                                          | none — renders the `printableData` already returned by `postTransaction`                                                                      |
| Refunds                                                                                                                                | Same components as collection, `requestType: "Refund"`                                                                                                                             | same as collection                                                                                                                            |
| Live Dashboard — KPI tiles, payment-mode/category donuts, OPD/IPD/Emergency billing-service treemap, hourly chart, recent transactions | `Dashboard/Dashboard.jsx`                                                                                                                                                          | **none today** — see §10, everything is aggregated client-side from the `recentTransactions` array already in memory                          |
| Recent Transactions → Reprint                                                                                                          | `Dashboard/Dashboard.jsx`                                                                                                                                                          | **not wired to anything yet** — the button has no `onClick` (§10)                                                                             |
| Recent Transactions → Cancel bill                                                                                                      | `Dashboard/Dashboard.jsx`                                                                                                                                                          | **client-only today** — `CashCollection/CashCollection.jsx`'s `cancelBill()` just patches local state; no backend call exists yet (§10)       |
| Export CSV                                                                                                                             | `Dashboard/Dashboard.jsx`                                                                                                                                                          | none — builds the CSV from data already in memory                                                                                             |
| End Shift → count cash → confirm                                                                                                       | `Shift/Shift.jsx`                                                                                                                                                                  | `prepareShiftClose()`, then `closeShift(command)`                                                                                             |
| Cross-day "you left a shift open overnight" detection                                                                                  | `Shift/Shift.jsx` + `CashCollection/CashCollection.jsx`                                                                                                                            | **prototype-only today**, via a real-wall-clock timestamp in `localStorage` — see §10 for how the real backend does this correctly for free   |
| Start Shift again (same day or after a stale close)                                                                                    | `CashCollection/CashCollection.jsx`                                                                                                                                                | `reopenShift(command)`                                                                                                                        |
| Reprint Receipt (top nav, visible only once shift closed)                                                                              | `CashCollection/CashCollection.jsx` → `TopNav`                                                                                                                                     | none — placeholder `window.print()` today                                                                                                     |

---

## 7. The mock backend (`src/mocks/`)

`src/mocks/prototypeServices.js` implements **all 16** contract methods over
`src/mocks/prototypeData.js`'s in-memory fixtures. It is a genuinely useful
reference for exact request/response shapes (see `docs/api/`), but it also
takes shortcuts a real backend must not:

In the current development integration, `applicationRuntime.js` replaces its
pending-list, metrics, request-detail, and patient-header reads with live
legacy data. The remaining prototype methods are still active scaffolding.

- Every method wraps its result in a fixed ~1 second artificial delay
  (`withLatency()`) purely so the UI's loading/skeleton states are visible —
  **not** something to reproduce on purpose, but also not something to
  optimize away as a "bug"; a real network call will have its own latency.
- All state is held in closures (`let pendingRequests = …`, a few `Map`s for
  idempotency) that reset the instant the page reloads. A real backend
  persists to a database.
- `businessDate` in the shift methods is **always** today's fixed fictional
  date (`PROTOTYPE_DATA.todayIso`, hard-coded to `"2024-09-03"`) — it never
  actually advances. See §10 for why this matters.
- Eligibility rules (`eligibilityFor()`) are simplified, representative
  checks — enough to demo the UI branching, not enough to be a real
  authorization/business-rule engine. §9 has the full rule set a real
  backend must implement instead.

**`src/mocks/` is never imported by feature code and is compiled out of a
production build.** Only `applicationRuntime.js` imports it, and only behind
the `NODE_ENV === "development"` check.

---

## 8. Building the real backend

The frontend already defines the _exact_ contract a backend must satisfy:
`contracts/openapi.yaml` (machine-readable, OpenAPI 3.0.3) and
`src/contracts/cashCollection.contract.js` (the runtime validator). Implement
against those and verify with `docs/api/*.md` for exact field names. Once the
complete surface is ready, replace the staged development adapter explicitly.
Do not add a fixture fallback for production values.

### 8.1 The 16 methods you must implement

| #   | Method                     | HTTP                                    | Purpose                                                         | Full spec                                                                       |
| --- | -------------------------- | --------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1   | `loadBootstrap`            | `GET /bootstrap`                        | Everything needed to render the app cold                        | [`docs/api/01-bootstrap.md`](./api/01-bootstrap.md)                             |
| 2   | `searchPatients`           | `GET /patients`                         | CR/name/mobile lookup                                           | [`docs/api/04-patient-search.md`](./api/04-patient-search.md)                   |
| 3   | `listPendingRequests`      | `GET /requests`                         | The queue table                                                 | [`docs/api/02-pending-requests.md`](./api/02-pending-requests.md)               |
| 4   | `getPendingRequestMetrics` | `GET /dashboard/pending-metrics`        | Queue counts by hospital service × request type                 | [`docs/api/02-pending-requests.md`](./api/02-pending-requests.md)               |
| 5   | `getDashboard`             | `GET /dashboard`                        | Server-aggregated dashboard (defined, not yet called by the UI) | [`docs/api/11-dashboard.md`](./api/11-dashboard.md)                             |
| 6   | `getRequest`               | `GET /requests/{id}`                    | Opening one request                                             | [`docs/api/03-request-detail.md`](./api/03-request-detail.md)                   |
| 7   | `getTariffs`               | `GET /tariffs`                          | Tariff search/catalogue                                         | [`docs/api/05-tariffs.md`](./api/05-tariffs.md)                                 |
| 8   | `getPaymentOptions`        | `GET /payment-options`                  | Modes, card types, terminals, restrictions                      | [`docs/api/06-payment-options.md`](./api/06-payment-options.md)                 |
| 9   | `checkEligibility`         | `POST /eligibility`                     | Can this transaction proceed?                                   | [`docs/api/07-eligibility.md`](./api/07-eligibility.md)                         |
| 10  | `initiateTerminalPayment`  | `POST /terminal-payments`               | Start a POS attempt                                             | [`docs/api/08-terminal-payments.md`](./api/08-terminal-payments.md)             |
| 11  | `getTerminalPaymentStatus` | `GET /terminal-payments/{id}`           | Poll a POS attempt                                              | [`docs/api/08-terminal-payments.md`](./api/08-terminal-payments.md)             |
| 12  | `postTransaction`          | `POST /transactions`                    | Collect / refund / estimate                                     | [`docs/api/09-post-transaction.md`](./api/09-post-transaction.md)               |
| 13  | `listTransactions`         | `GET /transactions`                     | Recent transactions / reports                                   | [`docs/api/10-transactions-list.md`](./api/10-transactions-list.md)             |
| 14  | `prepareShiftClose`        | `GET /shifts/current/close-preparation` | Read-only, before closing                                       | [`docs/api/12-shift-close-preparation.md`](./api/12-shift-close-preparation.md) |
| 15  | `closeShift`               | `POST /shifts/{id}/close`               | Commit the shift close                                          | [`docs/api/13-shift-close.md`](./api/13-shift-close.md)                         |
| 16  | `reopenShift`              | `POST /shifts/{id}/reopen`              | Start a new segment                                             | [`docs/api/14-shift-reopen.md`](./api/14-shift-reopen.md)                       |

Two more endpoints are **not yet in the contract** but are needed to make
buttons that already exist in the UI actually work — see
[`docs/api/15-cancel-transaction-GAP.md`](./api/15-cancel-transaction-GAP.md)
and [`docs/api/16-reprint-GAP.md`](./api/16-reprint-GAP.md).

### 8.2 The envelope every response uses

```json
{ "success": true, "data": { "...": "..." }, "requestId": "trace-id" }
```

```json
{
  "success": false,
  "requestId": "trace-id",
  "error": {
    "code": "PATIENT_NOT_ADMITTED",
    "message": "Human-readable, shown to the clerk.",
    "fieldErrors": {}
  }
}
```

`src/services/httpClient.js` unwraps `data` automatically and throws a typed
`ApiError` (with `.code`, `.status`, `.fieldErrors`, `.requestId`) whenever
`success` is `false` or the HTTP status isn't OK. Recommended status mapping:

| Status  | Meaning                                                            |
| ------- | ------------------------------------------------------------------ |
| 400     | Malformed input / `VALIDATION_FAILED`                              |
| 401     | Session missing/expired                                            |
| 403     | Authenticated but not permitted                                    |
| 404     | Resource doesn't exist                                             |
| 409     | Stale version / already processed / idempotency conflict           |
| 422     | Business rule rejected it (see the eligibility code table in §9.3) |
| 502/503 | Legacy HBIMS or POS provider unavailable                           |
| 500     | Unhandled — the write was rolled back                              |

### 8.3 Numbers are strings, everywhere

Every amount, count, percentage, CR number, bill number and version token in
every API response is a **JSON string**, never a JSON number — this mirrors
the underlying database's `character varying` columns and avoids float
rounding entering the wire format at all. `"amount": "480.00"`, not
`"amount": 480`. The frontend only ever parses these to numbers temporarily,
for sorting or chart totals — it never sends a computed number back as
authoritative. Do the real math in the database/service layer with a decimal
type (`BigDecimal` in Java, `numeric` in Postgres/Oracle) — never a Java
`double` or JS float — for anything financial.

### 8.4 Idempotency

Every `POST /transactions`, `POST /shifts/{id}/close` and
`POST /shifts/{id}/reopen` call carries an `Idempotency-Key` header
(`src/features/cashCollection/services/idempotency.js` generates one UUID per
workspace session with `crypto.randomUUID()`). **Claim the key before the
financial write, inside the same transaction.** A retry with the same key
must return the exact same result without writing twice. A different payload
reusing an already-claimed key is a `409` conflict.

### 8.5 The posting sequence (`POST /transactions`)

This is the single most important sequence in the whole backend. Do all of
this **inside one database transaction**, in this order:

1. Validate the session and resolve hospital/seat/counter/role from the
   server side — never from the request body.
2. Reload the billing-option descriptor server-side and verify
   `billingServiceId` / `processingBillingServiceId` / `workflowId` /
   request type against the current, authoritative billing matrix. **Never**
   dispatch using a `legacyMode` value the client sent — resolve it yourself.
3. Run the full eligibility check again (§9.3) — reload the patient,
   episode/admission, account and request/charge state under lock. A
   successful `checkEligibility` call minutes earlier proves nothing by
   itself.
4. If `source: "request"`, reject an already-processed/changed request by
   its version (`409 REQUEST_ALREADY_PROCESSED` / `REQUEST_CHANGED`).
5. Validate every line's `discount` is a percentage `0`–`100`, then
   recompute `lineGross = rate * qty`, `lineDiscount = lineGross * discount / 100`,
   `lineNet = max(0, lineGross - lineDiscount)` yourself — never trust a
   client-sent line total.
6. For an account/settlement workflow, recompute the payable amount from the
   locked account/request, not from `displayedTotal`.
7. Compare your recomputed total against the client's `displayedTotal`;
   mismatch → `409 AMOUNT_CHANGED` with the refreshed figures, no write.
8. For Card/UPI, verify the terminal approval belongs to this counter, this
   terminal, this amount, and hasn't already been consumed by another
   transaction.
9. Claim the `Idempotency-Key`.
10. Call the mapped legacy write path (§9) or your own persistence layer,
    inside the transaction, and read back every `OUT` value.
11. Persist an immutable printable snapshot (patient, lines, payment,
    totals, document date) — this is exactly what gets returned and printed;
    it must never be recomputed later from mutable data.
12. Mark the source request processed (if any). Commit once.
13. On any failure at any step, roll back everything — no partial
    ledger/request/payment state.
14. Return `{ documentNumber, status, printableData }` (see
    [`docs/api/09-post-transaction.md`](./api/09-post-transaction.md) for the
    exact shape). The frontend refuses to proceed without a complete
    `printableData` object — it will not fabricate receipt data locally.

### 8.6 Suggested Spring Boot package layout

```text
in.cdac.billing.cashcollection/
  config/          security, Jackson, persistence and external adapter wiring
  controller/      REST controllers only — thin, no business logic
  dto/             request/response records matching contracts/openapi.yaml exactly
  service/         eligibility, pricing, posting and query orchestration
  repository/      Spring JDBC/JPA access to the service's own tables (audit, idempotency, sessions)
  domain/          transaction, request, payment and workflow rules — the actual business logic
  integration/
    hbims/           anti-corruption adapter for legacy HBIMS procedures/schemas (see §9)
    pos/              terminal initiation, status polling and reconciliation
  validation/      cross-field and workflow validators
  exception/       stable error codes ↔ HTTP status ↔ envelope mapping
```

Resolve `userId`, `seatId`, `hospitalCode`, active counter and permissions
from the authenticated session (or a trusted gateway claim) once, and apply
that same scope to _every_ query — bootstrap, requests, patient search,
reports, posting, and reprints alike. Never let a browser-supplied value pick
a different hospital, counter, or permission set (§9.4).

---

## 9. Connecting to the legacy HBIMS system

HBIMS is the **existing, already-live** hospital billing system this app's
counter screens are replacing the front end for. The backend you build does
**not** reinvent billing — it calls the same verified write paths HBIMS
already uses, so the ledger, reports and legacy screens stay correct.

### 9.1 Verified legacy source (checked against the real HBIMS Java source)

| Concern                           | Verified source file                                                                                                                                                                                                              |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Struts controller                 | `src/billing/transactions/CashCollectionOfflineTransBSCNT.java`                                                                                                                                                                   |
| Form bean                         | `src/billing/transactions/CashCollectionOfflineTransFB.java`                                                                                                                                                                      |
| DATA layer                        | `src/billing/transactions/CashCollectionOfflineTransBSDATA.java`                                                                                                                                                                  |
| Main JSP                          | `WebContent/billing/transactions/cashcollection_offline_billtransNew.jsp`                                                                                                                                                         |
| Browser behavior                  | `WebContent/billing/js/cashcollection_offline_transBS.js`                                                                                                                                                                         |
| Online request / final-settlement | `WebContent/billing/js/cashcollection_online_trans.js`, `CashCollectionOnlineTransCNT/DATA/DAO.java`                                                                                                                              |
| Day-end / shift close             | `PKG_BILL_VIEW.proc_dayened_cash_amount_dtls` (mode `1`) → `DayEndTransDATA` → `DayEndTransBO` → `DayEndTransDAO.insertAddDataProc` → `Pkg_Bill_Dml.DML_DAYEND_DTL`; browser validation in `WebContent/billing/js/DayEndTrans.js` |
| Action URL                        | `/HBIMS/billing/transactions/CashCollectionOfflineTransBSCNT.cnt`                                                                                                                                                                 |
| Dispatch parameter                | `hmode` (a request parameter, not a path segment)                                                                                                                                                                                 |

### 9.2 Verified `hmode` and database service-ID matrix

Captured against hospital code `100`. `id` is the visible master option
users pick; `processingServiceId` is the service the legacy write path
actually uses (they differ for IPD Bill Settlement — see the note below).

| Hospital service | Charge type ID | Billing service           |              `id` | `processingServiceId` | `hmode` (Receipt)       | `hmode` (Refund)         |
| ---------------- | -------------: | ------------------------- | ----------------: | --------------------: | ----------------------- | ------------------------ |
| OPD Normal       |              1 | Service                   |                10 |                    10 | `OFFRECSER`             | `OFFREFUNDSER`           |
| OPD Special      |              4 | Service-Spl. Clinic       |                10 |                    10 | `OFFRECSER`             | `OFFREFUNDSER`           |
| Emergency        |              3 | Service                   |                12 |                    12 | `OFFRECSER`             | `OFFREFUNDSER`           |
| IPD              |              2 | Service                   |                11 |                    11 | `OFFRECSER`             | `OFFREFUNDSER`           |
| IPD              |              2 | Advance                   |                19 |                    19 | `OFFRECADV`             | `OFFREFUNDADMCANCEL`     |
| IPD              |              2 | Package                   |                13 |                    13 | `OFFRECPACK`            | `OFFREFUNDSER`           |
| IPD              |              2 | Part Payment              |                20 |                    20 | `OFFRECPARTPAY`         | `OFFREFUNDPARTPAYCANCEL` |
| IPD              |              2 | Bill Settlement           |            **35** |                **21** | `ONLINEFINALSETTLEMENT` | `SERVER_RESOLVED` ⚠      |
| Any              |            any | Estimation (all services) | (same as Receipt) |                (same) | `OFFESTIMATION`         | —                        |

**Bill Settlement's `id`/`processingServiceId` split is not a typo.** The
visible master row for IPD Bill Settlement is service `35`, but the database
has **zero** transaction history under service `35` — all final-settlement
history (44 inbound / 341 outbound rows, verified) lives under service `21`,
which is also what the package/final-adjustment logic
(`dml_online_finalsettlement`) actually writes to. **Never create a
service-35 transaction row just because the UI selected option `35`** —
always resolve and write to `21`.

**Bill Settlement _refund_ (`legacyMode: "SERVER_RESOLVED"`) has no verified
write route at all.** The database master advertises it as available, but no
checked evidence shows a working dispatch. Until you find and verify one,
`checkEligibility` must return `WORKFLOW_NOT_IMPLEMENTED` for it — do **not**
map it to a convenient-looking refund mode by guessing from the label.

`proc_sblt_billservice_mst` (the procedure that produces the visible
billing-service list) currently hardcodes hospital `100`. Fix that hardcoding
before a multi-hospital deployment; don't reproduce it in a new endpoint.

### 9.3 Eligibility rule order and codes

Run this **one shared eligibility service** from both `checkEligibility` and
again, under lock, inside `postTransaction` (§8.5 step 3) — never trust a
result computed even a few requests ago.

1. Resolve authenticated hospital/seat/role/active counter/business
   date/day-end/deposit state and feature flags from the session/database.
2. Reload the visible billing-service matrix; confirm the charge type is
   active/visible/effective and authorized for this counter; resolve
   `processingServiceId` and `hmode` server-side.
3. Reload the patient by opaque key/CR — never trust a browser-supplied
   status, category, ward, account number or episode.
4. Select the exact episode/admission for the requested charge type. For a
   request-based collection, use the episode/admission/account **stored
   against that pending request**, not the patient's current summary episode
   — OPD/IPD/Emergency remain distinct contexts even under one CR.
5. Apply the legacy admission-state rule for the workflow (accepted / dead /
   gone / discharged / final-bill / reopen), using real status codes, not
   the display string `"Admitted"`.
6. Validate account state: Advance must reject an already-open account;
   Part Payment and Bill Settlement require an active account.
7. For a queued request, reload `sblt_inbound_dtl` by hospital + request key
   and confirm `gnum_isvalid`, `hblnum_status`, type, CR/admission/account,
   receipt state and concurrency version.
8. For a service/package receipt or estimate, load eligible tariffs with the
   same category/department/ward/unit/effective-date filters the legacy
   helper uses; no eligible tariff → `NO_ELIGIBLE_TARIFF`.
9. For a refund, find committed, uncancelled source receipts and compute the
   remaining refundable quantity/amount after any prior refunds.
10. For Advance refund, verify the admission/account cancellation state and
    remaining unadjusted advance (`OFFREFUNDADMCANCEL`'s rules).
11. For Part Payment refund, verify the source receipt and remaining
    refundable amount (`OFFREFUNDPARTPAYCANCEL`'s rules).
12. For Bill Settlement, resolve `35 → 21`, load the final-adjustment lines,
    and reject an already-finalized or incompatible admission/account state.
13. Load allowed payment modes from the patient's billing category and
    counter POS configuration (credit categories, CGHS/CM-relief
    restrictions, wallet rules, POS/manual-fallback permission).
14. Return **only** the option values the browser is allowed to choose from
    — it never invents a department/episode/category/ward/tariff/amount.

| Code                               | Returned when                                                      |
| ---------------------------------- | ------------------------------------------------------------------ |
| `WORKFLOW_NOT_ALLOWED`             | Combination inactive, hidden or unauthorized                       |
| `WORKFLOW_NOT_IMPLEMENTED`         | Master exposes a combination with no verified write route          |
| `HOSPITAL_SERVICE_MISMATCH`        | Patient has no eligible episode for this OPD/IPD/Emergency context |
| `PATIENT_NOT_ADMITTED`             | Required IPD admission is absent                                   |
| `ADMISSION_STATE_NOT_ALLOWED`      | Admission exists but its status disallows this workflow            |
| `ACCOUNT_ALREADY_OPEN`             | Advance would open a duplicate account                             |
| `ACCOUNT_NOT_OPEN`                 | Part Payment/Settlement needs an active account                    |
| `ACCOUNT_FINALIZED`                | Account/final-bill state blocks further work                       |
| `SETTLEMENT_BREAKDOWN_UNAVAILABLE` | Final-settlement lines can't be reconciled to a total              |
| `REQUEST_ALREADY_PROCESSED`        | Another counter/user already completed the request                 |
| `REQUEST_CHANGED`                  | Request version/patient/service/amount changed since load          |
| `NO_ELIGIBLE_TARIFF`               | No active tariff/package available                                 |
| `NO_REFUNDABLE_BILL`               | No refundable source receipt                                       |
| `REFUND_QUANTITY_EXCEEDED`         | Requested refund exceeds the server-calculated balance             |
| `PAYMENT_MODE_NOT_ALLOWED`         | Category/workflow disallows the selected mode                      |

An **ineligible** result is a normal `200` business response
(`{ "eligible": false, "code": "...", "message": "..." }`), not an HTTP
error. Reserve `400/401/403/5xx` for the request/session/server itself
failing. Full example payloads: [`docs/api/07-eligibility.md`](./api/07-eligibility.md).

### 9.4 Session and counter rules — never trust the browser for these

- `HOSPITAL_CODE`, `SEATID`, `IP_ADDR`, `USER_LEVEL`, counter ID, counter
  status, permissions and day-end state come from the **server session**,
  every time, on every read and every write. If a request body contains any
  of these, ignore the value and log a warning — never copy it into a
  downstream call.
- Re-check counter-open / day-end / deposit state immediately before
  posting — a bootstrap response can be stale by the time a clerk finishes a
  workflow.
- `401` for missing/expired login, `403` for a valid login without
  permission, `409` when the counter/request state changed since bootstrap.
- Scope queue, reports, totals, receipts, refunds and reprints to the
  server-resolved counter, unless a separately verified cross-counter role
  permission says otherwise.

### 9.5 POS terminal and manual fallback

`initiateTerminalPayment` must return immediately with a server-owned
`terminalTransactionId` — it never blocks waiting for the terminal. The
browser polls `getTerminalPaymentStatus` every 10 seconds for up to 5
minutes. Never return or log a full card number, CVV, track data, PIN, or
raw provider secret — `cardLastFour` is the most that's ever exposed. The
manual-fallback dialog is only offered by the UI after a failed/timed-out
terminal attempt; validate its structured fields (bank, reference, date,
last-4) server-side too — it is a **verified fallback**, not a free-text
bypass. Guard against a browser retry double-posting a successful POS charge
by keying on the provider transaction ID plus your idempotency key. Full
shapes: [`docs/api/08-terminal-payments.md`](./api/08-terminal-payments.md).

### 9.6 Shift close / reopen

Full sequence and exact fields: [`docs/api/12`](./api/12-shift-close-preparation.md),
[`13`](./api/13-shift-close.md), [`14`](./api/14-shift-reopen.md). The rules that matter most:

- `previousSubmittedCash` (already-closed segments today) and
  `expectedCash` (this open segment only) are always reported **separately**
  — the frontend reconciles only the current segment's denomination count,
  while the backend submits the **cumulative** total to the legacy day-end
  write.
- `reconciliationMode: "SKIPPED"` still requires the backend to recheck the
  authoritative cash total — "skipped" means the clerk didn't count notes and
  coins, not that the server stops verifying.
- `businessDate` in the close-preparation response must be the **real
  calendar date the shift actually opened on** (from your own persistence),
  not always "today". This is the field that makes the frontend's "you left
  a shift open overnight" messaging correct automatically — see §10, the
  current mock hard-codes this to today, which is exactly why the frontend
  had to fake the same behavior with a `localStorage` timestamp instead.
- `reopenShift` must be safe under two concurrent attempts — exactly one new
  segment is created; the loser gets the idempotent replay of the winner's
  result, not a second segment.

### 9.7 Two ways to wire this up — pick one, don't half-do both

This repository's history has explored two different integration shapes.
**Pick one deliberately; do not mix them.**

**Option A — extend the existing Struts action.** Add new JSON-producing
`hmode` values to `CashCollectionOfflineTransBSCNT` (or a narrowly-scoped
sibling action in the same module), continuing to call the existing
DATA/BO/DAO/procedure path for every write. Lowest risk to existing JSP
behavior; keeps everything in one deployable. This app's `services/legacyHbimsBridge.js`
documents the exact action URL and request-mode codes this option would use
(`OFFRECSER` / `OFFREFUNDSER` / `OFFESTIMATION` and the `35→21` alias) — it
is **not wired into any live code path today**, it exists purely as this
reference.

**Option B — a standalone Spring Boot service** (§8.6's package layout),
talking to the same database, with an `integration/hbims` anti-corruption
adapter that calls the legacy stored procedures/tables directly and maps
their rows into the `contracts/openapi.yaml` DTOs. This is the shape the
current frontend's cookie-session, `/api/cash-collection` base path and
`contracts/openapi.yaml` already assume, and is the recommended option
unless there's a specific deployment reason to stay inside the Struts
process.

Either way: keep legacy table names, procedure parameters, mode codes and
datasource details **inside the adapter layer** — never expose a
database-shaped response straight to the React app.

### 9.8 Outstanding legacy verification

A read-only Postgres catalog query was prepared to confirm the exact
function signatures and tables behind the day-end write path
(`proc_dayened_cash_amount_dtls`, `dml_dayend_dtl`,
`proc_check_dayend_allowed`, `proc_hblt_payment_detail`,
`proc_get_counter_user`, plus any `%dayend%`/`%denomination%` tables) against
a database registered in pgAdmin as `AIIMS_NEW`
(`10.226.80.35:5445`, user `aiimsnew`). That query was never run — do it
before enabling the shift-close write endpoint:

```sql
BEGIN READ ONLY;

SELECT current_database() AS database_name, current_user AS database_user,
       current_setting('transaction_read_only') AS read_only;

SELECT n.nspname AS schema_name, p.proname AS routine_name,
       pg_get_function_arguments(p.oid) AS arguments,
       p.prorettype::regtype::text AS return_type
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE lower(p.proname) IN (
  'proc_dayened_cash_amount_dtls', 'dml_dayend_dtl',
  'proc_check_dayend_allowed', 'proc_hblt_payment_detail', 'proc_get_counter_user'
)
ORDER BY n.nspname, p.proname;

SELECT table_schema, table_name, column_name, data_type, ordinal_position
FROM information_schema.columns
WHERE lower(table_name) LIKE ANY (ARRAY['%dayend%', '%day_end%', '%cash_handover%', '%denomination%'])
ORDER BY table_schema, table_name, ordinal_position;

ROLLBACK;
```

It neither invokes the procedures nor changes data — safe to run any time.
Compare the returned signatures against whatever DAO parameter order you
implement against before enabling writes.

---

## 10. Known gaps, dead code and prototype-only shortcuts

Read this before you "fix" something that looks broken — some of it is
intentional prototype scaffolding, some of it is a real gap the backend
needs to close, and some of it is genuinely dead code left over from an
earlier iteration of this app.

| What                                                                                                     | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | What to do                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Confirmation/Confirmation.jsx` (`<Confirmation/>`, the "Collection Confirmed" success screen)           | **Dead code.** Nothing ever sets `stage` to `"confirmation"`. The real flow prints and returns straight to the queue (`CashCollection/CashCollection.jsx`'s `confirm()` calls `resetHome()` directly).                                                                                                                                                                                                                                                                                                                             | Either delete the file, or wire it in if you want an explicit success screen — currently the UX is intentionally "print and move on."                                                                                                                                                                                                                                                                                                                                                                                                      |
| `Collection/Direct/Direct.jsx`'s `EstimatesHome` + `stage: "estimates"`                                  | **Dead code / unreachable.** `startEstimate()` sets `mode: "direct"`, `stage: "home"` — it never sets `"estimates"`. Estimates are actually reached by setting Direct Collection's **Transaction Type** dropdown to "Estimation".                                                                                                                                                                                                                                                                                                  | Delete `EstimatesHome` and the `stage === "estimates"` branch, or repurpose them as a shortcut into the same flow.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `mocks/prototypeData.js`'s `collectionModes` fixture                                                     | **Unused by the current dashboard.** `Dashboard/Dashboard.jsx` derives its own payment-mode donut from `recentTransactions` directly.                                                                                                                                                                                                                                                                                                                                                                                              | Safe to ignore; don't spend backend effort computing this field unless you reintroduce a consumer.                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Dashboard aggregation (`getDashboard` / `getPendingRequestMetrics`)                                      | **Defined in the contract, not called by the UI.** `Dashboard/Dashboard.jsx` never calls a service method — it loads `recentTransactions` once (via bootstrap) and computes every KPI/chart/breakdown client-side in JavaScript.                                                                                                                                                                                                                                                                                                   | Implement `getDashboard` anyway (it's in the 16-method contract and the OpenAPI spec) for future scale, but know that **today**, the thing the real backend must get right is returning a complete, correctly-tagged `recentTransactions` array — see [`docs/api/10`](./api/10-transactions-list.md) for exactly which fields the client-side aggregation reads (including `hospitalService`/`billingService`, added for the OPD/IPD/Emergency treemap, which is **not yet in `contracts/openapi.yaml`**'s `Transaction` schema — add it). |
| "Cancel bill" (Recent Transactions table)                                                                | **Client-only.** `CashCollection/CashCollection.jsx`'s `cancelBill(no)` just marks a row `Cancelled` in local React state (`txPatches`); nothing is sent to a server.                                                                                                                                                                                                                                                                                                                                                              | Add a real endpoint (proposed shape: [`docs/api/15-cancel-transaction-GAP.md`](./api/15-cancel-transaction-GAP.md)) and wire the button to call it before trusting this feature in production — right now a page reload silently undoes every "cancelled" bill.                                                                                                                                                                                                                                                                            |
| "Reprint" (Recent Transactions table)                                                                    | **Not wired at all** — the button renders with no `onClick` handler.                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Decide whether reprint re-opens the stored `printableData` for that document (needs the backend to persist and return it) or just re-triggers `window.print()` against data already in memory. Proposed shape: [`docs/api/16-reprint-GAP.md`](./api/16-reprint-GAP.md).                                                                                                                                                                                                                                                                    |
| "Reprint Receipt" (top nav, after End Shift)                                                             | **Placeholder.** Calls `window.print()` directly with whatever's currently rendered; does not re-fetch anything.                                                                                                                                                                                                                                                                                                                                                                                                                   | Fine as-is for a same-day printer-jam fallback, since the shift report is already on screen when it's clicked.                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Cross-day "shift left open overnight" detection                                                          | **Prototype-only workaround.** Because the mock's `businessDate` never advances (always `PROTOTYPE_DATA.todayIso`), `model/reportDates.js` invented `shiftOpenedAt`/`todayLocalIso`/`readShiftOpenedAt`/`writeShiftOpenedAt` — real wall-clock timestamps kept in `localStorage` — purely so the UI has _something_ to compare against for a demo.                                                                                                                                                                                 | **Delete this workaround once the real backend returns a real `businessDate`** in `prepareShiftClose()`'s response (§9.6) — the existing UI logic in `Shift/Shift.jsx` (`isStaleShift`) already compares `businessDate` correctly; the `localStorage` code only exists to fake that field's realism against the mock.                                                                                                                                                                                                                      |
| `src/services/legacyHbimsBridge.js`                                                                      | **Reference only, not on any live path.** No code imports it outside its own tests (if any). It documents Option A from §9.7.                                                                                                                                                                                                                                                                                                                                                                                                      | Keep it as documentation, or delete it if you commit to Option B (standalone Spring Boot) and want to avoid confusion.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `src/utilities/sessionService.js`, `src/services/{legacyHbimsPendingRequests,legacyHbimsPatientInfo}.js` | **Live, but temporary.** Development bootstrap always fetches `pendinglist`, replaces the fixture queue/count, and uses `patinfo` by CR number when a request opens. A failed ticket/backend call produces the error screen; no dummy-request fallback exists. See API [17](./api/17-legacy-hbims-bridge-STAGED.md) and [18](./api/18-patient-tile-STAGED.md). API [19](./api/19-request-tariff-details.md), which supplies tariff lines for both OPD and IPD plus optional IPD-only context, is specified but not yet wired live. | Replace the staged mappers when the real request and patient endpoints exist, then wire API 19 independently. Keep request metadata, patient tile, and tariff details as separate calls. Preserve the no-fallback behavior and keep session/backend constants centralized in `sessionService.js`.                                                                                                                                                                                                                                          |
| Ant Design (`antd`, `@ant-design/icons`)                                                                 | Used only for `ConfigProvider`, `Alert`, `Button` (in the bootstrap loader/retry screen) and `Loader`. The rest of the app is hand-written feature CSS under `src/features/cashCollection/` plus `src/styles/application.css`, not Ant components.                                                                                                                                                                                                                                                                                 | Don't assume every control is an antd component — check the file before changing a form field.                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `docs/` before this rewrite                                                                              | Described an app shape (`OverviewPage.jsx` + `ReportsPage.jsx` as separate dashboard/report screens, a `SideRail` left-nav, `src/services/cashCollectionApi.js`) that no longer matches this repo — those pages were consolidated into today's single `Dashboard/Dashboard.jsx`, and the nav is `TopNav` (Collection / Dashboard).                                                                                                                                                                                                 | Nothing to do — this document replaces those. If you find old references elsewhere (e.g. in commit messages), trust the current source over them.                                                                                                                                                                                                                                                                                                                                                                                          |

---

## 11. Commands

```bash
npm install
npm start             # dev server, port 3000, live pendinglist/patinfo
npm test               # Jest + RTL
npm run build           # production bundle
npm run format          # Prettier over src/**, contracts/**, docs/**, README.md, package.json
npm run format:check    # CI-friendly check, no writes
```

There is no lint script beyond CRA's built-in `eslint-config-react-app`
(wired through `react-scripts start`/`build`, which fail the build on lint
errors already).

---

## 12. Acceptance checklist before go-live

**Contract**

- [ ] `/bootstrap` passes `normalizeCashCollectionData()` with zero warnings.
- [ ] Every billing option has `id`, `label`, `processingServiceId`,
      `uiFamily`, `legacyMode` — tampering with any one is rejected server-side.
- [ ] All 16 methods in `CASH_COLLECTION_SERVICE_METHODS` are implemented and match `docs/api/*`.
- [ ] Decimal strings are stable for zero, refunds, large values and paise.

**Counter isolation**

- [ ] Counter A and counter B never see each other's queue/totals/reprints without a verified cross-counter role.
- [ ] A tampered payload claiming a different hospital/seat/counter is ignored, not honored.
- [ ] Closing the counter between bootstrap and post produces a conflict and writes nothing.

**Financial correctness**

- [ ] Receipt, refund and estimate all reconcile against the legacy ledger for every billing service in §9.2.
- [ ] IPD Bill Settlement always writes to service `21`, never `35`.
- [ ] Settlement line sums exactly match Settlement Amount, the Collect button, `displayedTotal`, the committed response and the printed receipt.
- [ ] Changing a settlement charge between eligibility and posting produces `AMOUNT_CHANGED` with refreshed lines and no write.
- [ ] Two concurrent posts against the same request: exactly one succeeds.
- [ ] Double-click / retry / timeout-after-commit: no duplicate posting.
- [ ] Cash/Card/UPI/Cheque, disallowed category/mode combinations, POS success, POS failure, authorized manual fallback.

**Shift**

- [ ] `businessDate` reflects the real date a shift opened on, not always "today".
- [ ] Skipping the denomination count still re-verifies the authoritative cash total.
- [ ] Two concurrent reopen attempts create exactly one new segment.

**Security**

- [ ] Session expiry mid-read and mid-write both handled.
- [ ] No full card number, CVV, or session secret ever appears in a response, log, or error.
- [ ] SQL-injection / script-injection strings and malformed JSON are rejected, not sanitized-and-accepted.

**Printing**

- [ ] Printed document number, patient, lines, amount, payment and status all come from the committed `postTransaction` response — nothing is computed client-side for the receipt.

---

## 13. If you are an AI agent building the backend from this doc

Suggested order, each step independently testable against the existing
frontend through an explicit adapter change once the complete surface is ready:

1. Stand up the envelope/error/session/counter-resolution plumbing shared by every endpoint (§8.2, §9.4).
2. Implement the read-only endpoints first: `/bootstrap`, `/requests`, `/requests/{id}`, `/patients`, `/tariffs`, `/payment-options`, `/dashboard/pending-metrics`. Verify each against its file in `docs/api/`.
3. Implement `/eligibility` using the full rule order in §9.3 — this is required before anything can post.
4. Implement `/terminal-payments` (initiate + status) per §9.5.
5. Implement `/transactions` (`POST`) using the exact sequence in §8.5 — start with the lowest-risk workflow (OPD Service receipt) before Bill Settlement.
6. Implement `/shifts/current/close-preparation`, `/shifts/{id}/close`, `/shifts/{id}/reopen` per §9.6, with a real `businessDate`.
7. Implement `/dashboard` and `/transactions` (`GET`) so the dashboard has real data to aggregate (client-side aggregation continues to work unchanged as long as the row shape in [`docs/api/10`](./api/10-transactions-list.md) is exact, including `hospitalService`/`billingService`).
8. Close the two gaps in §10: a real cancel-transaction endpoint, and a real reprint path — both are currently client-only or unwired.
9. Delete the prototype-only `localStorage` shift-timing shim in `model/reportDates.js` once step 6 returns a real `businessDate` (§10).
10. Run through the full checklist in §12 before switching production to the complete REST adapter.

Do not modify any file under `src/mocks/` to "make the backend match" — it is
throwaway fixture data for design review only. Match the contract instead
(`contracts/openapi.yaml`, `src/contracts/cashCollection.contract.js`, and
`docs/api/`).
