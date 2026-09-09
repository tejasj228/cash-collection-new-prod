# HBIMS cash collection backend implementation guide

## 1. Goal and current boundary

This guide describes how to connect the React cash collection redesign in this repository to the existing HBIMS billing implementation. The backend work has **not** been implemented yet. The frontend is prepared so the HBIMS build cannot silently render prototype patients or transactions:

- `src/main.jsx` is the standalone design-review entry and explicitly injects `src/prototypeData.js` plus `src/prototypeServices.js`.
- `src/hbims-entry.jsx` is the production HBIMS entry. `mount()` requires a data model, and `mountFromServices()` requires the complete service adapter listed in `src/integration/dataContract.js`.
- `src/prototypeData.js` is excluded from the HBIMS bundle because the HBIMS entry does not import it.
- The server must own hospital, logged-in user/seat, IP, counter state, permissions, totals, transaction identity, and persistence.

The integration is complete only when every checklist item in section 15 passes against a running HBIMS environment.

## 2. Verified legacy implementation to preserve

The checked source is under `C:\Office_Workspace\HBIMS`.

| Concern                                      | Verified source                                                                                                |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Struts controller                            | `src/billing/transactions/CashCollectionOfflineTransBSCNT.java`                                                |
| Form bean                                    | `src/billing/transactions/CashCollectionOfflineTransFB.java`                                                   |
| DATA layer                                   | `src/billing/transactions/CashCollectionOfflineTransBSDATA.java`                                               |
| Main JSP                                     | `WebContent/billing/transactions/cashcollection_offline_billtransNew.jsp`                                      |
| Browser behavior                             | `WebContent/billing/js/cashcollection_offline_transBS.js`                                                      |
| Online request and final-settlement behavior | `WebContent/billing/js/cashcollection_online_trans.js`                                                         |
| Online controller/DATA/DAO                   | `CashCollectionOnlineTransCNT.java`, `CashCollectionOnlineTransDATA.java`, `CashCollectionOnlineTransDAO.java` |
| Action URL                                   | `/HBIMS/billing/transactions/CashCollectionOfflineTransBSCNT.cnt`                                              |
| Dispatch parameter                           | `hmode`                                                                                                        |

The existing write modes verified in the controller and browser script include:

| Operation                        | Existing `hmode`         | Existing DATA method                                                    |
| -------------------------------- | ------------------------ | ----------------------------------------------------------------------- |
| Service receipt                  | `OFFRECSER`              | `insertOfflineReceiptService`                                           |
| Service refund                   | `OFFREFUNDSER`           | `insertOfflineRefundService`                                            |
| Estimate                         | `OFFESTIMATION`          | `insertOfflineEstimation`                                               |
| Advance receipt                  | `OFFRECADV`              | inspect its controller branch before mapping                            |
| Part payment receipt             | `OFFRECPARTPAY`          | inspect its controller branch before mapping                            |
| Package receipt                  | `OFFRECPACK`             | inspect its controller branch before mapping                            |
| Admission cancellation refund    | `OFFREFUNDADMCANCEL`     | `insertOfflineRefundAdmissionCancellation`                              |
| Part payment cancellation refund | `OFFREFUNDPARTPAYCANCEL` | `insertOfflineRefundPartPayment`                                        |
| Online final adjustment          | `ONFINALADJUST`          | follow `CashCollectionOnlineTransCNT` into `dml_online_finalsettlement` |

Do not collapse these modes into a new database write path until their form fields, DATA/BO/DAO behavior, stored procedures, transaction boundaries, and output attributes have been compared. A JSON adapter may route to the existing methods, but it must preserve their business behavior.

### Verified database service IDs

The database outputs captured on 08 September 2026 establish this active selection matrix for hospital code `100`:

| Charge type | Charge type ID | Receipt                                                                           | Refund                        | Estimation                 |
| ----------- | -------------: | --------------------------------------------------------------------------------- | ----------------------------- | -------------------------- |
| OPD Normal  |              1 | Service (10)                                                                      | Service (10)                  | Service (10)               |
| IPD         |              2 | Service (11), Advance (19), Package (13), Part Payment (20), Bill Settlement (35) | the same five visible choices | Service (11), Package (13) |
| Emergency   |              3 | Service (12)                                                                      | Service (12)                  | Service (12)               |
| OPD Special |              4 | Service-Spl. Clinic (10)                                                          | Service-Spl. Clinic (10)      | Service-Spl. Clinic (10)   |

`proc_sblt_billservice_mst` filters `gnum_isvalid = 1`, `sblnum_isvisible = 1`, the selected charge type, and the comma-delimited request-type membership. Its current implementation hardcodes hospital `100` and does not use `sblstr_filename` to choose a screen. Correct that hospital scoping before multi-hospital deployment; do not reproduce the hardcoded value in a new endpoint.

The visible IPD Bill Settlement master row is service `35`, but supplied inbound/outbound transaction history contains no service-35 rows. Final-settlement history and package logic use service `21`: 44 valid inbound request rows and 341 valid outbound rows were returned for service 21, while service 35 returned none. The package source also routes final adjustment through service `21` and `dml_online_finalsettlement`. Therefore bootstrap must expose both identifiers: `id: "35"` for the current visible choice and `processingServiceId: "21"` for the established final-settlement path. The server must verify this alias from its own configuration; it must reject a client-supplied processing ID that does not match the selected visible service.

## 3. Counter and login rule

The redesign is a counter-based program even though counter labels were intentionally removed from the visible UI.

`CashCollectionOfflineTransBSCNT.unspecified()` currently:

1. Reads `HOSPITAL_CODE` from the HTTP session.
2. Applies day-end/deposit checks from `BillConfigUtil` and the session `UserVO`.
3. Reads the POS integration flag.
4. Calls `CashCollectionOfflineTransBSDATA.checkCounterStatus()` when `BillConfigUtil.CHECK_COUNTER_STATUS` is enabled.
5. Refuses to proceed when the returned counter state is invalid.

The write methods populate these values from the server session before entering the DATA layer:

- `HOSPITAL_CODE`
- `SEATID`
- `IP_ADDR`
- `USER_LEVEL`

Rules for every new JSON mode:

- Use the existing authenticated HBIMS session and same-origin cookies.
- Resolve the active counter from the server-side session/current counter lookup on every sensitive read and every write.
- Never accept hospital code, seat ID, user level, IP address, counter ID, counter status, permissions, or day-end status as authoritative request JSON.
- If a client sends any of those fields, ignore them and log a validation warning; do not copy them into the form bean or VO.
- Scope queue, reports, totals, receipts, refunds, and reprints to the resolved server counter unless the logged-in role has a separately verified cross-counter permission.
- Recheck counter-open/day-end/deposit state immediately before posting. A bootstrap response can become stale.
- Return `401` for an absent/expired login, `403` for a valid login without permission, and `409` when the counter/request state changed after the page loaded.

The frontend may receive a non-authoritative display label such as the operator name. It does not currently display a counter number and does not need one in the bootstrap payload.

## 4. Recommended backend shape

Keep the existing Struts action and add JSON-producing `hmode` methods to it, or add a narrowly scoped sibling action in the same billing module. A sibling action is easier to reason about if changing the current controller risks legacy JSP behavior. In either case, continue to call the existing DATA/BO/DAO and stored-procedure path for writes.

Proposed read modes are names, not claims that they already exist:

| Proposed `hmode`            | Frontend service                    |
| --------------------------- | ----------------------------------- |
| `REDESIGN_BOOTSTRAP`        | `loadBootstrap()`                   |
| `REDESIGN_PATIENT_SEARCH`   | `searchPatients(query)`             |
| `REDESIGN_PENDING_REQUESTS` | `listPendingRequests(filters)`      |
| `REDESIGN_REQUEST_DETAIL`   | `getRequest(requestId)`             |
| `REDESIGN_TARIFF_SEARCH`    | `getTariffs(filters)`               |
| `REDESIGN_PAYMENT_OPTIONS`  | `getPaymentOptions(context)`        |
| `REDESIGN_ELIGIBILITY`      | `checkEligibility(context)`         |
| `REDESIGN_POS_INITIATE`     | `initiateTerminalPayment(command)`  |
| `REDESIGN_POS_STATUS`       | `getTerminalPaymentStatus(command)` |
| `REDESIGN_POST`             | `postTransaction(command)`          |
| `REDESIGN_TRANSACTIONS`     | `listTransactions(filters)`         |

Before adding these names, search all Struts actions and JavaScript for collisions. Register no new action mapping if the existing action is extended.

All responses should use UTF-8 JSON:

```http
Content-Type: application/json; charset=UTF-8
Cache-Control: no-store
X-Content-Type-Options: nosniff
```

Use one envelope everywhere:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "requestId": "server-correlation-id"
}
```

Failure example:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "COUNTER_NOT_OPEN",
    "message": "Cash collection is unavailable for the current login.",
    "fieldErrors": {}
  },
  "requestId": "server-correlation-id"
}
```

Do not return stack traces, SQL text, procedure names, raw delimited helper output, session identifiers, or trusted session values.

## 5. Frontend service adapter

Create a normal JavaScript file inside HBIMS, for example:

```text
WebContent/billing/cash-collection-redesign/hbims-cash-collection-services.js
```

It must define every method checked by `assertCashCollectionServices()`:

```js
window.hbimsCashCollectionServices = {
  loadBootstrap,
  searchPatients,
  listPendingRequests,
  getRequest,
  getTariffs,
  getPaymentOptions,
  checkEligibility,
  initiateTerminalPayment,
  getTerminalPaymentStatus,
  postTransaction,
  listTransactions,
};
```

Use a shared request helper:

```js
function callCashCollection(hmode, body) {
  return fetch(
    window.HBIMS_CONTEXT_PATH +
      "/billing/transactions/CashCollectionOfflineTransBSCNT.cnt?hmode=" +
      encodeURIComponent(hmode),
    {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body || {}),
    },
  ).then(async function (response) {
    const payload = await response.json().catch(function () {
      return null;
    });
    if (!response.ok || !payload || payload.success === false) {
      const error = new Error(
        (payload && payload.error && payload.error.message) ||
          "Cash Collection request failed.",
      );
      error.code = payload && payload.error && payload.error.code;
      error.status = response.status;
      throw error;
    }
    return payload.data;
  });
}
```

If the deployed HBIMS security layer requires a request token, read a server-rendered browser-safe token and send it in the exact form/header expected by the existing validator. Do not assume the checked `CSRFGardTokenAction` behavior is sufficient; characterize it in the target deployment.

## 6. Bootstrap model

`loadBootstrap()` returns the complete initial read model consumed by `App`. `src/integration/dataContract.js` rejects a missing or malformed model. This prevents sample data from appearing in HBIMS.

Required top-level shape:

```json
{
  "todayIso": "2026-09-07",
  "facility": {
    "name": "Hospital display name",
    "subtitle": "Optional receipt subtitle"
  },
  "serviceOptions": [],
  "billingByService": {},
  "patients": [],
  "requests": [],
  "tariffGroups": [],
  "tariffCatalog": [],
  "collectionModes": [],
  "recentTransactions": [],
  "recentEstimates": [],
  "paymentOptions": {
    "modes": [],
    "cardTypes": [],
    "posTerminals": [],
    "restrictionsByCategory": {}
  }
}
```

`todayIso` must be the hospital/business date from the server, not the browser clock. For initial integration, bootstrap may contain the first page needed by the current UI. When datasets grow, keep the same shapes and load filtered pages through the dedicated methods.

### Hospital services and billing-service options

`serviceOptions` and `billingByService` are coupled API data. Do not send a single global billing-service list: the direct-collection screen reads the list for the selected hospital service and transaction type only. The browser never infers these options from labels.

```json
{
  "serviceOptions": [
    {
      "id": "opd-normal",
      "legacyChargeTypeId": "1",
      "label": "OPD Normal",
      "short": "OPD",
      "title": "Routine outpatient service",
      "description": "...",
      "tone": "blue",
      "icon": "stethoscope"
    },
    {
      "id": "opd-special",
      "legacyChargeTypeId": "4",
      "label": "OPD Special",
      "short": "SP",
      "title": "Specialty clinic visit",
      "description": "...",
      "tone": "violet",
      "icon": "spark"
    },
    {
      "id": "ipd",
      "legacyChargeTypeId": "2",
      "label": "IPD",
      "short": "IPD",
      "title": "Inpatient account",
      "description": "...",
      "tone": "teal",
      "icon": "bed"
    },
    {
      "id": "emergency",
      "legacyChargeTypeId": "3",
      "label": "Emergency",
      "short": "ER",
      "title": "Emergency services",
      "description": "...",
      "tone": "coral",
      "icon": "pulse"
    }
  ],
  "billingByService": {
    "opd-normal": {
      "Receipt": [
        {
          "id": "10",
          "label": "Service",
          "processingServiceId": "10",
          "uiFamily": "tariff-entry",
          "legacyMode": "OFFRECSER"
        }
      ],
      "Refund": [
        {
          "id": "10",
          "label": "Service",
          "processingServiceId": "10",
          "uiFamily": "service-refund",
          "legacyMode": "OFFREFUNDSER"
        }
      ],
      "Estimation": [
        {
          "id": "10",
          "label": "Service",
          "processingServiceId": "10",
          "uiFamily": "tariff-entry",
          "legacyMode": "OFFESTIMATION"
        }
      ]
    },
    "opd-special": {
      "Receipt": [
        {
          "id": "10",
          "label": "Service-Spl. Clinic",
          "processingServiceId": "10",
          "uiFamily": "tariff-entry",
          "legacyMode": "OFFRECSER"
        }
      ],
      "Refund": [
        {
          "id": "10",
          "label": "Service-Spl. Clinic",
          "processingServiceId": "10",
          "uiFamily": "service-refund",
          "legacyMode": "OFFREFUNDSER"
        }
      ],
      "Estimation": [
        {
          "id": "10",
          "label": "Service-Spl. Clinic",
          "processingServiceId": "10",
          "uiFamily": "tariff-entry",
          "legacyMode": "OFFESTIMATION"
        }
      ]
    },
    "ipd": {
      "Receipt": [
        {
          "id": "11",
          "label": "Service",
          "processingServiceId": "11",
          "uiFamily": "tariff-entry",
          "legacyMode": "OFFRECSER"
        },
        {
          "id": "19",
          "label": "Advance",
          "processingServiceId": "19",
          "uiFamily": "account-payment",
          "legacyMode": "OFFRECADV"
        },
        {
          "id": "13",
          "label": "Package",
          "processingServiceId": "13",
          "uiFamily": "package-entry",
          "legacyMode": "OFFRECPACK"
        },
        {
          "id": "20",
          "label": "Part Payment",
          "processingServiceId": "20",
          "uiFamily": "account-payment",
          "legacyMode": "OFFRECPARTPAY"
        },
        {
          "id": "35",
          "label": "Bill Settlement",
          "processingServiceId": "21",
          "uiFamily": "bill-settlement",
          "legacyMode": "ONLINEFINALSETTLEMENT"
        }
      ],
      "Refund": [
        {
          "id": "11",
          "label": "Service",
          "processingServiceId": "11",
          "uiFamily": "service-refund",
          "legacyMode": "OFFREFUNDSER"
        },
        {
          "id": "19",
          "label": "Advance",
          "processingServiceId": "19",
          "uiFamily": "advance-refund",
          "legacyMode": "OFFREFUNDADMCANCEL"
        },
        {
          "id": "13",
          "label": "Package",
          "processingServiceId": "13",
          "uiFamily": "package-refund",
          "legacyMode": "OFFREFUNDSER"
        },
        {
          "id": "20",
          "label": "Part Payment",
          "processingServiceId": "20",
          "uiFamily": "part-payment-refund",
          "legacyMode": "OFFREFUNDPARTPAYCANCEL"
        },
        {
          "id": "35",
          "label": "Bill Settlement",
          "processingServiceId": "21",
          "uiFamily": "bill-settlement-refund",
          "legacyMode": "SERVER_RESOLVED"
        }
      ],
      "Estimation": [
        {
          "id": "11",
          "label": "Service",
          "processingServiceId": "11",
          "uiFamily": "tariff-entry",
          "legacyMode": "OFFESTIMATION"
        },
        {
          "id": "13",
          "label": "Package",
          "processingServiceId": "13",
          "uiFamily": "package-entry",
          "legacyMode": "OFFESTIMATION"
        }
      ]
    },
    "emergency": {
      "Receipt": [
        {
          "id": "12",
          "label": "Service",
          "processingServiceId": "12",
          "uiFamily": "tariff-entry",
          "legacyMode": "OFFRECSER"
        }
      ],
      "Refund": [
        {
          "id": "12",
          "label": "Service",
          "processingServiceId": "12",
          "uiFamily": "service-refund",
          "legacyMode": "OFFREFUNDSER"
        }
      ],
      "Estimation": [
        {
          "id": "12",
          "label": "Service",
          "processingServiceId": "12",
          "uiFamily": "tariff-entry",
          "legacyMode": "OFFESTIMATION"
        }
      ]
    }
  }
}
```

Each option is an executable workflow descriptor, not display text. `id` is the visible master option, `processingServiceId` is the server-verified service used by the legacy write path, `uiFamily` chooses the React form, and `legacyMode` documents the intended allowlisted route. The browser sends these fields back for concurrency/error detection, but the server reloads and verifies the descriptor before every lookup and write.

The client validates that every option contains `id`, `label`, `processingServiceId`, `uiFamily`, and `legacyMode`. The backend must return only the authorized, counter-specific combinations for the current hospital, business date, operator role and feature configuration. It must never create labels such as “Service refund”; `Refund` already expresses the operation and the billing service label remains the master value.

The current database master advertises Bill Settlement for request type 2, but the supplied cash-collection JavaScript/controller/package evidence contains no verified Bill Settlement refund dispatch. The standalone adapter returns `WORKFLOW_NOT_IMPLEMENTED` for that choice. Production bootstrap should omit or disable it until the deployed write route and rollback behavior are identified; never map it to a convenient refund mode by label.

CR numbers, admission numbers, account numbers, request numbers, and document numbers remain opaque backend values. The React view removes whitespace only when rendering these identifiers. Keep the original values in API models and posting commands; never reconstruct a database key from the compact display text.

### Patient

```json
{
  "id": "opaque-patient-key",
  "name": "Patient name",
  "age": 48,
  "sex": "Male",
  "cr": "93911 26000 00001",
  "ipd": "2024 0260 0046",
  "account": "2024 1726 0045",
  "episode": "IPD / General Medicine",
  "status": "Admitted",
  "department": "General Medicine",
  "unit": "Medicine Unit 2",
  "ward": "Ward 4B",
  "bed": "Bed 12",
  "roomType": "General ward",
  "consultant": "Doctor name",
  "admittedOn": "03/09/2024 · 11:47",
  "category": "General — CGHS",
  "mobile": "masked or authorized display value"
}
```

Use `"—"` or `null` consistently for unavailable fields and normalize it in one adapter. Do not leak full mobile numbers unless the existing role is allowed to see them.

### Pending request

```json
{
  "id": "BIL-2024-1142",
  "dateIso": "2026-09-07",
  "patient": "Patient name",
  "patientId": "opaque-patient-key",
  "cr": "93911 26000 00001",
  "type": "IPD Advance Deposit",
  "location": "Ward 2A / Bed 08",
  "date": "07/09/2026",
  "amount": "8000.00",
  "waiting": "1h 04m",
  "raisedBy": "Ward 2A nursing station",
  "department": "Orthopaedics",
  "version": "opaque-concurrency-version",
  "lines": []
}
```

Amounts should travel as decimal strings in the API. Convert to a decimal/money type on the server; do not use Java `double` for financial calculations. The current prototype accepts formatted strings for display, but the adapter should normalize API decimals before passing them to React.

### Charge line

```json
{
  "code": "INV-2201",
  "name": "Complete blood count",
  "group": "Investigation",
  "rate": 290.0,
  "qty": 1,
  "discount": 0.0,
  "allowedQuantity": 1,
  "version": "opaque-line-version"
}
```

`discount` is a percentage from `0.00` through `100.00`, not a currency amount. For example, `rate: 500.00`, `qty: 2`, and `discount: 10.00` produces a gross of `1000.00`, a discount amount of `100.00`, and a line net of `900.00`. Reject negative percentages, values above 100, non-numeric values, and percentages whose scale exceeds the configured limit. The browser currently allows two decimal places.

### Transaction/report row

```json
{
  "no": "REC-2026-088241",
  "patient": "Patient name",
  "dateIso": "2026-09-07",
  "cr": "93911 26000 00001",
  "mode": "Cash",
  "amount": "4280.00",
  "time": "10:38 AM",
  "status": "Completed"
}
```

## 7. Pagination and filtering

The UI shows 10 rows per page for queues and reports. The production API should paginate on the server.

Request shape:

```json
{
  "page": 1,
  "pageSize": 10,
  "query": "patient, CR or request",
  "type": "All Charge Types",
  "department": "All Departments",
  "fromDate": "2026-09-07",
  "toDate": "2026-09-07",
  "paymentMode": "All modes",
  "sort": { "field": "date", "direction": "desc" }
}
```

Response shape:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 10,
  "total": 0,
  "totals": {
    "grossCollections": "0.00",
    "refunds": "0.00",
    "netCollections": "0.00",
    "byPaymentMode": []
  }
}
```

Calculate report totals across the complete filtered result on the server, not only the ten returned rows. Apply an allowlist for sort fields. Cap `pageSize` and search length. Treat dates in the hospital time zone.

## 8. Patient, request, tariff, and payment lookups

### `searchPatients(query)`

- Require a trimmed minimum query length for name/mobile searches.
- Permit exact CR/admission/account searches according to existing HBIMS rules.
- Scope results to the hospital in session.
- Return only episodes/accounts the user is allowed to bill.
- Include whether the row has a pending request so the overview search can route correctly.
- Do not build SQL by concatenating the query.

### `listPendingRequests(filters)` and `getRequest(requestId)`

- Scope to the current hospital and active counter/user rules.
- Exclude completed/cancelled/stale requests according to the existing workflow.
- Return a concurrency version or source last-modified value.
- On open, load authoritative lines again; do not trust the amount shown in the queue.
- Return `404` when unknown and `409 REQUEST_ALREADY_PROCESSED` when another counter completed it.

### `getTariffs(filters)`

Map the current legacy lookups only after examining their request/response delimiters and HLP/DAO behavior. Relevant existing browser modes include `GROUPDTLS`, `TARIFFDTLS`, `TARIFFCODEDTLS`, `TARIFFCODEDTLSDRUG`, `PKGGROUPDTLS`, `PKGDTLS`, and `TRFUNIT`.

Tariff eligibility depends on hospital service, request type, billing service, treatment category, ward/special ward, package state, and patient/account context. Do not implement a global unscoped tariff search.

### `getPaymentOptions(context)`

Relevant existing behavior includes `AJX_PAYMENTMODEBYPATCAT` plus the POS integration configuration. Return:

- allowed modes;
- disabled modes with a human-readable reason;
- permitted card types;
- POS terminals available to the current server-resolved counter;
- whether manual fallback is permitted for Card/UPI;
- any amount limits or category restrictions.

The server must enforce the same rules during posting even if the UI already disabled a choice.

### `checkEligibility(context)`

Call this endpoint immediately after the cashier chooses a patient, hospital service, request type and billing service, and again when a pending request is opened. Its response controls whether React opens the workflow page:

```json
{
  "eligible": true,
  "code": "ELIGIBLE",
  "message": null,
  "workflow": {
    "billingServiceId": "35",
    "processingBillingServiceId": "21",
    "workflowId": "bill-settlement",
    "legacyMode": "ONLINEFINALSETTLEMENT"
  },
  "patientContextVersion": "opaque-version",
  "workflowContext": {
    "raisingDepartments": [{ "id": "101", "label": "General Medicine" }],
    "episodes": [{ "id": "opaque-episode", "label": "03-Sep-2026 / IPD" }],
    "patientCategories": [{ "id": "27", "label": "General" }],
    "wards": [{ "id": "14", "label": "Ward 4B" }],
    "roomTypes": [{ "id": "2", "label": "General ward" }],
    "payableAmount": "12960.00",
    "chargeBreakdown": [
      {
        "lineId": "opaque-account-charge-key",
        "version": "opaque-line-version",
        "code": "BED-2041",
        "name": "General ward bed charge / day",
        "group": "Accommodation",
        "rate": "1200.00",
        "qty": 6,
        "discount": "0.00"
      }
    ]
  }
}
```

#### Bill Settlement charge breakdown contract

`chargeBreakdown` is required when `workflowId` is `bill-settlement`. It is the read-only explanation of the amount the cashier is about to settle. Do not return only `payableAmount`: a total without its source lines cannot be reviewed and previously caused the screen to show the first tariff rate as the settlement amount while the Collect button used the complete total.

For Direct Collection, build the breakdown after resolving the selected admission/account. For Request-Based Collection, reload the request and final-adjustment details from the database and return the refreshed authoritative lines; the queue row's cached amount and the browser's copy of its lines are discovery data only. Each line must contain:

- `lineId`: an opaque server key used to reload the same account/request charge during posting;
- `version`: a concurrency value or last-modified token;
- `code` and `name`: cashier-facing tariff identity from the applicable tariff master;
- `group`: the service/tariff group label used for review and printing;
- `rate`: the effective per-unit rate after the server applies the patient category, ward, package, effective date and other legacy pricing context;
- `qty`: the billable quantity as a positive decimal/integer supported by the legacy workflow;
- `discount`: the discount percentage for the complete line, constrained to `0.00`–`100.00`. If a legacy source stores a currency discount, convert it to a percentage only when the conversion is exact under the HBIMS currency rounding rule. Otherwise expose a separately typed adjustment instead of putting a currency value into this field.

The normalized line calculation is:

```text
lineGross = rate * qty
lineDiscount = lineGross * (discount / 100)
lineNet = max(0, lineGross - lineDiscount)
payableAmount = sum(lineNet for every returned settlement line)
```

Use decimal arithmetic (`BigDecimal` in Java and the database's numeric type) with the currency scale and rounding mode already used by HBIMS. Never calculate or persist financial values with Java `double`. The server must verify that the calculated line sum equals `payableAmount` before returning an eligible response. If the legacy final-adjustment calculation contains account-level credits, deposits, package adjustments, taxes, rounding or other values that cannot be represented as tariff lines, return them as explicit named adjustment lines or add a separately typed `adjustments` array and include it in the documented total equation. Never hide the difference in `payableAmount`.

The React settlement screen renders these lines without checkboxes or editable quantity/discount controls. It derives the visible Settlement Amount, Net Payment Amount and Collect button amount from the same breakdown. The backend remains authoritative: during posting it reloads every `lineId`, re-runs final-adjustment calculation under the transaction lock, and returns `409 AMOUNT_CHANGED` with a refreshed breakdown if any rate, quantity, discount, adjustment, account state or total changed.

Reject eligibility with a stable business result when the breakdown cannot be produced:

```json
{
  "eligible": false,
  "code": "SETTLEMENT_BREAKDOWN_UNAVAILABLE",
  "message": "The final settlement charge details could not be loaded. Refresh the account calculation and try again.",
  "workflow": null,
  "patientContextVersion": "opaque-version",
  "workflowContext": null
}
```

Do not allow the UI to continue with a synthetic one-line total in production. That fallback exists only in standalone prototype fixtures for non-settlement account workflows.

An ineligible response is a normal business result, not an HTTP failure:

```json
{
  "eligible": false,
  "code": "PATIENT_NOT_ADMITTED",
  "message": "The patient does not have an admission state allowed for final settlement.",
  "workflow": null,
  "patientContextVersion": "opaque-version",
  "workflowContext": null
}
```

Use `400/401/403/500` only when the request itself, session, permission or server failed. React displays the business message in the setup panel and stays on that page.

#### Eligibility evaluation order

Use one backend eligibility service from both `REDESIGN_ELIGIBILITY` and `REDESIGN_POST`. The post path must execute it again inside the posting transaction after locking/reloading the relevant request/account rows. Implement the checks in this order so the cashier receives one stable, actionable reason:

1. Resolve authenticated hospital, seat, role, active counter, business date, day-end/deposit state and feature flags from the session/database.
2. Reload the visible billing-service matrix. Confirm the charge type exists, is active/visible/effective, contains the request type and is authorized for this counter. Resolve the configured processing service and legacy mode on the server.
3. Reload the patient by its opaque key/CR. Do not trust browser status, admission number, category, ward, account number or episode.
4. Select the exact episode/admission relevant to the requested charge type. For Direct Collection, derive it from the patient's currently eligible episodes. For Request-Based Collection, use the episode, admission and account stored against the validated pending request; do not reject that request merely because the patient's current summary episode is different. OPD Normal, OPD Special, IPD and Emergency remain distinct contexts even when they share a CR number.
5. Apply the legacy admission-state rule for the workflow. Use admission status codes and existing procedure/helper results, not display strings such as `Admitted`. Final adjustment must reproduce the deployed legacy accepted/dead/gone/discharge and final-bill/reopen rules.
6. Validate account state. Advance receipt must reject an already-opened/advance-collected account where the existing flow rejects multiple accounts. Part Payment and Bill Settlement require the appropriate live patient account. Reject closed, invalid, finalised or mismatched accounts unless the exact legacy reopen flow permits them.
7. For request-based work, reload `sblt_inbound_dtl` by server hospital plus the internal request key. Confirm `gnum_isvalid`, `hblnum_status`, request type, charge type, billing service, CR/admission/account, receipt state and concurrency version. The 30-day patient listing is only discovery; age alone does not authorize posting.
8. For service/package receipt or estimation, load eligible tariffs/packages with the same category, department, ward, unit, effective-date and package-state filters used by the legacy helper/procedure. Return `NO_ELIGIBLE_TARIFF` when none exist.
9. For service/package refund, find committed, valid, uncancelled source receipts and calculate refundable quantity/amount after prior refunds. Require at least one refundable tariff; each requested refund quantity must be greater than zero and no greater than its server-calculated balance.
10. For Advance refund/admission cancellation, verify the exact admission/account cancellation state, available unadjusted advance and absence/presence of dependent finalisation records according to `OFFREFUNDADMCANCEL`.
11. For Part Payment refund, verify the source part-payment receipt, remaining refundable amount and cancellation state according to `OFFREFUNDPARTPAYCANCEL`.
12. For Bill Settlement, resolve visible service `35` to processing service `21`, load final-adjustment details and reject already-finalised, invalid-reopen or incompatible admission/account states. Do not create service-35 transaction rows merely because the UI selected 35.
13. Load allowed payment types/modes from the patient billing category and counter POS configuration. Preserve legacy restrictions for credit categories, CM Relief Fund, wallets, Card/UPI terminal evidence and manual fallback permissions.
14. Return only the allowed workflow fields and option values. The browser must not manufacture department, episode, category, ward, room, source receipt, tariff or payable amount choices.

#### Required eligibility codes

| Code                               | When returned                                                                            |
| ---------------------------------- | ---------------------------------------------------------------------------------------- |
| `WORKFLOW_NOT_ALLOWED`             | Charge type/request type/billing service combination is inactive, hidden or unauthorized |
| `WORKFLOW_NOT_IMPLEMENTED`         | Master/configuration exposes a combination whose deployed write route is not verified    |
| `HOSPITAL_SERVICE_MISMATCH`        | Patient has no eligible episode for the selected OPD/IPD/Emergency context               |
| `PATIENT_NOT_ADMITTED`             | Required IPD admission state is absent                                                   |
| `ADMISSION_STATE_NOT_ALLOWED`      | Admission exists but its status is incompatible with this workflow                       |
| `ACCOUNT_ALREADY_OPEN`             | Advance flow would open a duplicate account                                              |
| `ACCOUNT_NOT_OPEN`                 | Part payment/settlement requires an active account                                       |
| `ACCOUNT_FINALIZED`                | Account/final bill state prevents further work                                           |
| `SETTLEMENT_BREAKDOWN_UNAVAILABLE` | Final-settlement detail lines or a reconciled total cannot be produced                   |
| `REQUEST_ALREADY_PROCESSED`        | Request became completed/cancelled/invalid                                               |
| `REQUEST_CHANGED`                  | Request version, patient, service or amount context changed                              |
| `NO_ELIGIBLE_TARIFF`               | No active tariff/package can be used                                                     |
| `NO_REFUNDABLE_BILL`               | No valid source receipt has a refundable balance                                         |
| `REFUND_QUANTITY_EXCEEDED`         | Requested refund exceeds server balance                                                  |
| `PAYMENT_MODE_NOT_ALLOWED`         | Category/workflow rejects the selected payment mode                                      |

The React prototype contains only representative checks so the behavior is reviewable without HBIMS. Production correctness depends on this endpoint and the posting-time call to the same server eligibility service.

## 9. POS and manual fallback

`initiateTerminalPayment(command)` receives:

```json
{
  "paymentMode": "Card",
  "cardType": "Debit Card",
  "terminalId": "T1",
  "amount": "12960.00",
  "patientId": "opaque-patient-key",
  "description": "optional operator note"
}
```

The terminal ID is a selection request. Verify on the server that it belongs to the active hospital/counter and is enabled. Initiation must return immediately with a server-owned transaction ID. The browser displays a five-minute countdown and polls status every 10 seconds:

```json
{
  "terminalTransactionId": "opaque-server-transaction-id",
  "status": "PENDING",
  "pollAfterMs": 10000,
  "expiresInSeconds": 300
}
```

`getTerminalPaymentStatus({ "terminalTransactionId": "..." })` returns `PENDING` while the provider is waiting. On success it returns `APPROVED` with `approvalCode`, optional `cardLastFour`, `terminalId`, and `providerTransactionId`. It can also return `DECLINED`, `FAILED`, `CANCELLED`, or `EXPIRED` with a safe operator message. The server expiry remains authoritative even if the browser timer pauses.

Never return or store a full card number, CVV, track data, PIN, or raw provider secret. Do not log them.

If initiation or polling fails, return a stable error code. The UI enables Manual Details only after a failed terminal attempt. Manual fallback must be separately authorized and validated server-side. Store the operator-entered bank/transaction/date/card-last-four fields as structured data even if the current frontend also creates a readable description string.

Prevent a successful POS charge from being posted twice if the browser retries. Use the provider transaction ID plus a server idempotency key.

## 10. Posting command and authoritative response

The browser sends a command, never a finished ledger transaction:

```json
{
  "source": "request",
  "requestId": "BIL-2024-1142",
  "requestVersion": "opaque-concurrency-version",
  "requestType": "Receipt",
  "billingServiceId": "35",
  "billingServiceName": "Bill Settlement",
  "processingBillingServiceId": "21",
  "workflowId": "bill-settlement",
  "legacyMode": "ONLINEFINALSETTLEMENT",
  "hospitalServiceId": "ipd",
  "chargeTypeId": "2",
  "patientId": "opaque-patient-key",
  "crNumber": "93911 26000 00001",
  "patientContextVersion": "opaque-version",
  "workflowFields": {
    "raisingDepartmentId": "101",
    "episodeId": "opaque-episode",
    "patientCategoryId": "27",
    "wardId": "14",
    "roomTypeId": "2"
  },
  "lines": [
    {
      "code": "INV-2201",
      "qty": 1,
      "discount": 0,
      "version": "opaque-line-version"
    }
  ],
  "displayedTotal": "290.00",
  "payment": {
    "mode": "Cash",
    "description": "optional note",
    "summary": "Cash · optional note"
  },
  "idempotencyKey": "browser-generated-uuid"
}
```

For a successful Card or UPI terminal flow, `payment` additionally contains `terminalId`, Card flows contain `cardType`, and `terminalApproval` contains the adapter response (`approvalCode`, `providerTransactionId`, `terminalId`, and any safe card reference such as `cardLastFour`). For an authorised manual fallback, `payment.manualDetails` contains the structured fields saved by the manual-details dialog and `terminalApproval` is absent. Treat `summary` as printable display text only; validate and persist the structured fields.

Every value in `workflowFields` must be one of the options returned by the successful eligibility response for the same `patientContextVersion`. Reload those choices during posting and reject stale or injected IDs. For account and settlement flows, recalculate the payable amount from the locked account; the editable/displayed amount is never authoritative.

Before calling the existing write path, the server must:

1. Validate the authenticated session and role.
2. Resolve and revalidate hospital, seat/user, IP, active counter, day-end, and deposit state.
3. Reload the workflow descriptor and verify `billingServiceId`, server-resolved `processingBillingServiceId`, `workflowId`, request type and allowlisted legacy mode. Never dispatch using the client `legacyMode` directly.
4. Run the shared eligibility service and reload the patient, episode/admission, account, category, request, and charge lines.
5. Reject an already-processed or changed request using its version.
6. Validate every discount as a percentage from 0 through 100, then recalculate tariff rates, quantities, monetary discount amounts, gross, refund eligibility, and total.
7. Re-evaluate payment-mode/category/POS/manual-fallback rules.
8. Compare the server total with `displayedTotal`; reject mismatches with a refreshed calculation.
9. Claim the idempotency key before the financial write.
10. Populate the existing form bean/VO using server values and mapped command values.
11. Execute the existing DATA/BO/DAO/procedure path in the required transaction boundary.
12. Commit once; on failure, roll back every related ledger/request/payment change.
13. Read the authoritative receipt/refund/estimate number and printable values from the committed result.
14. Mark the idempotency record completed and return the same response for safe retries.

Success response:

```json
{
  "documentNumber": "REC-2026-088241",
  "status": "Completed",
  "postedAt": "2026-09-07T10:38:00+05:30",
  "authoritativeTotal": "290.00",
  "printableData": {
    "documentType": "RECEIPT",
    "documentDate": "07/09/2026",
    "patient": {},
    "lines": [],
    "payment": {},
    "totals": {}
  }
}
```

The frontend now requires `documentNumber` and complete `printableData` from `postTransaction()`. It rejects incomplete committed responses and no longer creates receipt/refund numbers in the HBIMS bundle. The printed patient, lines, payment, total, date, and document number all come from this successful response.

## 11. Mapping the command to legacy form fields

Do this mapping from evidence, not field-name guesses:

1. Open `CashCollectionOfflineTransFB.java` and list every getter/setter used by the target write method.
2. In `cashcollection_offline_transBS.js`, inspect `submitForm`, `validateAndSubmit`, and `validateAndSubmit_new` around the branches that assign the write `hmode` values.
3. Record every named form field and generated multi-row value included for that branch.
4. Follow the corresponding controller method into `CashCollectionOfflineTransBSDATA.java`.
5. Record every form-bean-to-VO assignment.
6. Follow BO, DAO/HLP, stored procedure/function names, input order, output values, and commit/rollback behavior.
7. Build a mapping table with: React field, JSON field, form bean field, VO field, procedure parameter, source of truth, validation, and nullable rule.
8. Have a billing domain owner review the table before enabling writes.

Keep Receipt, Refund, and Estimation visibly and technically separate. Emergency is a service context, not an independent financial operation.

## 12. Controller implementation pattern

For each JSON method:

1. Set request and response encoding to UTF-8.
2. Set JSON/no-store headers before writing.
3. Resolve the HBIMS session and reject missing required keys.
4. Parse a bounded request body into a purpose-specific DTO. Do not bind arbitrary JSON directly to the large legacy form bean.
5. Validate required fields and allowlisted enum values.
6. Resolve trusted context from the session.
7. Call a new adapter/service method that converts normalized DTOs to the existing DATA path.
8. Convert helper/DataSet/delimited results to normalized DTOs in Java.
9. Serialize through the JSON library already active in the deployed HBIMS WAR; do not add a duplicate JSON stack without checking classloading.
10. Catch known business errors and map them to stable HTTP status/error codes.
11. Log the correlation ID, operation, server-resolved hospital/seat/counter references, result, and duration without logging patient/payment secrets.

Avoid writing JSON in a method that later returns the legacy JSP forward. Return `null` after a complete response or use the established project pattern for direct responses.

## 13. Error codes the UI adapter should understand

| HTTP | Code                               | Meaning                                                                  |
| ---- | ---------------------------------- | ------------------------------------------------------------------------ |
| 400  | `VALIDATION_FAILED`                | Invalid request or field values                                          |
| 401  | `SESSION_EXPIRED`                  | HBIMS login/session missing or expired                                   |
| 403  | `NOT_AUTHORIZED`                   | Role cannot perform the operation                                        |
| 409  | `COUNTER_NOT_OPEN`                 | Active counter check failed                                              |
| 409  | `DAY_END_REQUIRED`                 | Day-end must be completed                                                |
| 409  | `DEPOSIT_REQUIRED`                 | Counter deposit is pending                                               |
| 409  | `REQUEST_ALREADY_PROCESSED`        | Another user/counter completed it                                        |
| 409  | `AMOUNT_CHANGED`                   | Server recalculation differs from browser                                |
| 409  | `DUPLICATE_TRANSACTION`            | Duplicate/idempotency conflict                                           |
| 422  | `WORKFLOW_NOT_ALLOWED`             | Selected service/request combination is unavailable                      |
| 422  | `HOSPITAL_SERVICE_MISMATCH`        | Patient has no eligible episode in that service context                  |
| 422  | `PATIENT_NOT_ADMITTED`             | Required IPD admission is absent                                         |
| 422  | `ACCOUNT_ALREADY_OPEN`             | Advance would create a duplicate account                                 |
| 422  | `ACCOUNT_NOT_OPEN`                 | Part payment/final settlement has no active account                      |
| 422  | `SETTLEMENT_BREAKDOWN_UNAVAILABLE` | Final-settlement detail lines cannot be reconciled to the payable amount |
| 422  | `NO_ELIGIBLE_TARIFF`               | No tariff/package is available for the context                           |
| 422  | `NO_REFUNDABLE_BILL`               | No refundable receipt balance exists                                     |
| 422  | `REFUND_QUANTITY_EXCEEDED`         | Refund quantity exceeds the remaining balance                            |
| 422  | `PAYMENT_MODE_NOT_ALLOWED`         | Category or workflow disallows the mode                                  |
| 422  | `TERMINAL_TRANSACTION_REQUIRED`    | Card/UPI lacks approved POS/manual evidence                              |
| 502  | `TERMINAL_UNAVAILABLE`             | POS/provider call failed                                                 |
| 500  | `POSTING_FAILED`                   | Financial write failed and was rolled back                               |

Messages shown to the cashier should say what action to take. Keep technical detail in server logs under the correlation ID.

## 14. Asset and JSP integration

Build:

```powershell
npm ci
npm run build:hbims
```

Copy:

```text
dist-hbims/cash-collection.js
dist-hbims/cash-collection.css
```

to a stable HBIMS static directory such as:

```text
HBIMS/WebContent/billing/cash-collection-redesign/
```

Use `integration/hbims/cash-collection-mount.jsp.example` as the mount shape. Load the service adapter before calling `mountFromServices()`. Do not put `src/prototypeData.js` or `src/prototypeServices.js` into HBIMS.

The redesign CSS is scoped below `.hbims-cash-collection`, but verify it inside the real JSP because legacy global CSS and browser scripts can still affect descendants. Preserve required hidden fields or server-rendered token values until the JSON endpoints replace their purpose.

Because checked source and exploded/deployed WAR files can drift, verify the deployed asset hashes and active Struts mapping after publishing.

## 15. Required test and acceptance matrix

### Contract tests

- Bootstrap returns every required top-level property and passes `normalizeCashCollectionData()`.
- Empty arrays render valid empty states; no prototype patient or transaction appears.
- Invalid/missing bootstrap fails visibly.
- Every service returns the documented normalized shape.
- Every billing option has visible ID, processing ID, UI family and legacy mode; tampering with any one is rejected.
- `checkEligibility()` and `postTransaction()` return the same result for the same locked database state.
- Decimal formatting is stable for zero, refunds, large values, and paise.
- Dates use the hospital business date/time zone.

### Counter isolation

- Log in as counter/user A and record queue, totals, reports, terminals, and posting result.
- Log in as counter/user B and prove A-only rows/totals are absent unless a verified role permits them.
- Alter a browser payload to claim A's hospital/seat/counter while logged in as B; prove the server ignores/rejects it.
- Close the counter after bootstrap and before post; prove post returns a conflict and writes nothing.
- Exercise day-end/deposit blocks.

### Financial behavior

- Receipt service, advance, part payment, and package.
- OPD Normal, OPD Special, IPD and Emergency expose only their database-derived billing-service combinations.
- Visible IPD Bill Settlement `35` resolves to processing service `21`; no service-35 financial row is inserted.
- Bill Settlement returns every final-adjustment line with its opaque key/version, tariff identity, effective rate, quantity and discount.
- The sum of displayed settlement line amounts exactly matches Settlement Amount, Net Payment Amount, the Collect button, the posting command's `displayedTotal`, the committed response and the printed receipt.
- A settlement response with no lines, duplicate lines, invalid decimals, negative quantities, or a line sum different from `payableAmount` is rejected before payment can start.
- Change one settlement charge after eligibility but before posting; prove the server returns `AMOUNT_CHANGED` with refreshed lines and performs no financial write.
- Verify accommodation, consultation, investigation, procedure, pharmacy, package/credit/rounding adjustments and zero-discount/nonzero-discount cases against the legacy final-adjustment result.
- OPD/Emergency patients cannot enter an IPD-only workflow without an eligible admission/account.
- Advance rejects the deployed duplicate-account condition; part payment and settlement reject missing/finalised accounts.
- The online/request list shows only eligible request rows; recheck every row when opened and again when posted.
- Service refund, admission cancellation refund, and part-payment cancellation refund.
- Refund tests cover missing source receipt, cancelled source receipt, zero quantity, quantity above remaining balance and prior partial refunds.
- Estimation with no ledger/payment side effects beyond the existing intended estimate behavior.
- Cash, Card, UPI, Cheque, disallowed category/mode combinations, POS success, POS failure, and authorized manual fallback.
- Rate/quantity/discount-percentage tampering, including negative and above-100 percentages; server total must win.
- Two users open the same request and post concurrently; exactly one succeeds.
- Double click, browser retry, network timeout after commit, and refresh; no duplicate posting.
- Procedure failure halfway through; no partial ledger/request/payment state remains.

### Printing and reporting

- The printed document number, patient, lines, amount, payment, and status come from the committed response.
- Reprint retrieves committed server data.
- Report totals equal the legacy report/database result for the same hospital, counter, user scope, dates, and modes.
- Pagination totals cover the full filtered result, not the visible page.
- Refunds use the agreed sign convention in tables, totals, CSV, and print.

### Security and operations

- Session expiry during read and write.
- Direct calls without menu access/permission.
- Input length, enum allowlists, SQL injection strings, HTML/script strings, and malformed JSON.
- No full card or sensitive session data in browser responses, logs, or errors.
- Correlation IDs connect browser failures to server logs.
- Old JSP route remains available for rollback until UAT sign-off.

## 16. Recommended delivery order

1. Capture current legacy behavior and database effects for every target operation.
2. Implement shared JSON response/error/session/counter helpers.
3. Implement bootstrap and read-only lookup modes.
4. Create the HBIMS browser service adapter and mount the React bundle in a new route/menu entry.
5. Replace bootstrap-sized queue/report data with server pagination where required.
6. Implement POS initiation and structured manual fallback.
7. Implement idempotent posting one operation at a time, starting with the lowest-risk receipt flow.
8. Compare each new operation with the legacy JSP, DATA/BO/DAO calls, procedure results, ledger rows, and printed output.
9. Complete counter-isolation, concurrency, rollback, and permission UAT.
10. Switch the production menu only after acceptance; retain a tested rollback route for the agreed period.

## 17. Definition of ready

The current repository is frontend-integration ready: it has a dedicated HBIMS bundle, structured database-derived workflow descriptors, pre-entry eligibility messages, posting-time workflow revalidation in its standalone adapter, no production fallback to prototype fixtures, and a server-trusted session/counter policy. It is **not backend integrated** until HBIMS implements `checkEligibility`, the remaining adapter endpoints and server-side write routing described here, and the acceptance matrix passes against the deployed procedures.
