# Post a transaction (Collect / Refund / Estimate)

```http
POST /api/cash-collection/transactions
Idempotency-Key: <uuid>
```

The single most important endpoint. Fired when a clerk clicks **"Collect
₹…"**, **"Refund ₹…"**, or **"Save & Print Estimate"** on the Payment
Details / Review Estimate screen. Run the full 14-step sequence in
`PROJECT_GUIDE.md` §8.5 inside one database transaction — this file only
documents the wire shape.

The browser sends a **command**, never a finished ledger entry. Every price,
total, and permission gets recomputed and re-verified server-side before
anything is written.

## Request body

| Field                        | Type             | Notes                                                                                                                                                                                       |
| ---------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source`                     | string           | `"request"` \| `"direct"`.                                                                                                                                                                  |
| `requestId`                  | string, nullable | Present only when `source: "request"`.                                                                                                                                                      |
| `requestVersion`             | string, nullable |                                                                                                                                                                                             |
| `requestType`                | string           | `"Receipt"` \| `"Refund"` \| `"Estimation"`.                                                                                                                                                |
| `billingServiceId`           | string           | The chosen option's `id`.                                                                                                                                                                   |
| `billingServiceName`         | string           | The chosen option's `label` (e.g. `"Bill Settlement"`) — used by the dashboard's billing-service tagging, see below.                                                                        |
| `processingBillingServiceId` | string           | The chosen option's `processingServiceId`. The server **re-resolves and verifies** this — never dispatches on the client's copy.                                                            |
| `workflowId`                 | string           | The chosen option's `uiFamily`.                                                                                                                                                             |
| `legacyMode`                 | string           | The chosen option's `legacyMode`. Documentary only — the server decides the real dispatch.                                                                                                  |
| `hospitalServiceId`          | string           | `opd-normal` \| `opd-special` \| `ipd` \| `emergency`.                                                                                                                                      |
| `chargeTypeId`               | string           | The service's `legacyChargeTypeId`.                                                                                                                                                         |
| `patientId`                  | string, nullable |                                                                                                                                                                                             |
| `crNumber`                   | string, nullable |                                                                                                                                                                                             |
| `patientContextVersion`      | string           | Must match the version [`checkEligibility`](./07-eligibility.md) returned — reject a stale one.                                                                                             |
| `workflowFields`             | object           | The department/episode/category/ward/room IDs picked from `workflowContext` — every value must be one the eligibility response actually offered.                                            |
| `lines`                      | array            | `[{ code, name, group, rate, qty, discount, selected }]` — only rows with `selected: true` are billed. Recompute gross/discount/net server-side per line; never trust the client's numbers. |
| `displayedTotal`             | string decimal   | What the UI showed the clerk. Compare against your own recomputation; mismatch → `409 AMOUNT_CHANGED`.                                                                                      |
| `payment`                    | object           | See below.                                                                                                                                                                                  |
| `idempotencyKey`             | string           | Also sent as the `Idempotency-Key` header — claim it before the financial write.                                                                                                            |

### `payment`

| Field              | Type                                              | Notes                                                                                                                                                                                            |
| ------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mode`             | string                                            | `"Cash"` \| `"Card"` \| `"UPI"` \| `"Cheque"`.                                                                                                                                                   |
| `description`      | string                                            | Free-text note (required for Cheque).                                                                                                                                                            |
| `summary`          | string                                            | Human-readable one-liner, printed on the receipt — e.g. `"Debit Card ending 4821 · T1 · Approval 024-088501"`. Treat as **display text only**; validate the structured fields it was built from. |
| `cardType`         | string, present for Card                          |                                                                                                                                                                                                  |
| `terminalId`       | string, present for Card/UPI                      |                                                                                                                                                                                                  |
| `terminalApproval` | object, present for a successful terminal payment | The full [terminal-payment status response](./08-terminal-payments.md) — verify it belongs to this counter/terminal/amount and hasn't already been consumed.                                     |
| `manualDetails`    | object, present for a manual fallback             | `{ bankName, reference, cardLastFour, transactionDate, cardType, summary }` — validate every field server-side; this is a verified fallback, not a free-text bypass.                             |

### Example — Cash receipt

```json
{
  "source": "request",
  "requestId": "BIL-2024-1200",
  "requestVersion": "1",
  "requestType": "Receipt",
  "billingServiceId": "10",
  "billingServiceName": "Service",
  "processingBillingServiceId": "10",
  "workflowId": "tariff-entry",
  "legacyMode": "OFFRECSER",
  "hospitalServiceId": "opd-normal",
  "chargeTypeId": "1",
  "patientId": "4",
  "crNumber": "939112600000004",
  "patientContextVersion": "patient-4-v1",
  "workflowFields": {},
  "lines": [
    {
      "code": "CONS-118",
      "name": "Consultation — General Medicine",
      "group": "Consultation",
      "rate": 300,
      "qty": 1,
      "discount": 0,
      "selected": true
    },
    {
      "code": "INV-3312",
      "name": "ECG — 12 lead",
      "group": "Investigation",
      "rate": 180,
      "qty": 1,
      "discount": 0,
      "selected": true
    }
  ],
  "displayedTotal": "480.00",
  "payment": { "mode": "Cash", "description": "", "summary": "Cash" },
  "idempotencyKey": "a1b2c3d4-0000-4000-8000-000000000000"
}
```

## Response — success

| Field                  | Type             | Notes                                                                                                                                           |
| ---------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `documentNumber`       | string           | The authoritative receipt/refund/estimate number (e.g. `"REC-2026-088241"`, `"REF-…"`, `"EST-…"`). The frontend refuses to proceed without one. |
| `status`               | string           | `"Completed"` for Receipt, or your equivalent for Refund/Estimation.                                                                            |
| `resolvedRequestId`    | string, nullable | Echo the source request's ID so the frontend can remove it from the in-memory queue immediately.                                                |
| `printableData`        | object           | **Required, complete.** The frontend builds the printed receipt from this and nothing else.                                                     |
| `dashboardTransaction` | object, nullable | The row to prepend to the in-memory transactions list (omit/`null` for Estimation, which never posts a ledger row). Shape below.                |

### `printableData`

| Field             | Type           | Notes                                               |
| ----------------- | -------------- | --------------------------------------------------- |
| `documentType`    | string         | Echo `requestType`.                                 |
| `documentDate`    | string         | `DD/MM/YYYY`.                                       |
| `patient`         | object         | The full patient object, for the receipt header.    |
| `lines`           | array          | The final, server-recomputed charge lines.          |
| `payment`         | object         | Echo of the request's `payment`.                    |
| `totals.gross`    | string decimal |                                                     |
| `totals.discount` | string decimal |                                                     |
| `totals.net`      | string decimal | Must equal `documentNumber`'s actual posted amount. |

### `dashboardTransaction` — the row that feeds every dashboard chart

This is the same row shape as [`GET /transactions`](./10-transactions-list.md#response-fields)
— **including** `hospitalService` and `billingService`, which is how the
dashboard's OPD/IPD/Emergency billing-service treemap gets its data. Derive
them from `hospitalServiceId`/`billingServiceName` using the same mapping
tables as `src/contracts/cashCollection.contract.js`'s
`HOSPITAL_SERVICE_FAMILY` and `BILLING_SERVICE_BUCKET`:

```text
HOSPITAL_SERVICE_FAMILY = { "opd-normal": "OPD", "opd-special": "OPD", "ipd": "IPD", "emergency": "Emergency" }
BILLING_SERVICE_BUCKET  = { "Service": "Service", "Package": "Service", "Advance": "Advance",
                             "Part Payment": "Part Payment", "Bill Settlement": "Bill Settlement" }
```

## Example response

```json
{
  "success": true,
  "requestId": "trace-801",
  "data": {
    "documentNumber": "REC-2026-088241",
    "status": "Completed",
    "resolvedRequestId": "BIL-2024-1200",
    "dashboardTransaction": {
      "no": "REC-2026-088241",
      "patient": "Ajay Deshmukh",
      "cr": "939112600000004",
      "dateIso": "2026-09-13",
      "time": "10:38 AM",
      "mode": "Cash",
      "amount": "480.00",
      "status": "Completed",
      "department": "Cardiology",
      "category": "General",
      "requestType": "OPD Service",
      "hospitalService": "OPD",
      "billingService": "Service"
    },
    "printableData": {
      "documentType": "Receipt",
      "documentDate": "13/09/2026",
      "patient": {
        "id": "4",
        "name": "Ajay Deshmukh",
        "cr": "939112600000004",
        "episode": "IPD / Cardiology"
      },
      "lines": [
        {
          "code": "CONS-118",
          "name": "Consultation — General Medicine",
          "rate": 300,
          "qty": 1,
          "discount": 0
        },
        {
          "code": "INV-3312",
          "name": "ECG — 12 lead",
          "rate": 180,
          "qty": 1,
          "discount": 0
        }
      ],
      "payment": { "mode": "Cash", "summary": "Cash" },
      "totals": { "gross": "480.00", "discount": "0.00", "net": "480.00" }
    }
  }
}
```

## Failure — business rule rejected it

Same shape as [eligibility](./07-eligibility.md)'s codes, returned as an HTTP
error this time (posting is a write, not a query):

```json
{
  "success": false,
  "requestId": "trace-802",
  "error": {
    "code": "AMOUNT_CHANGED",
    "message": "The settlement total changed. Reload and try again.",
    "fieldErrors": {}
  }
}
```

Use `409` for `REQUEST_ALREADY_PROCESSED` / `AMOUNT_CHANGED` /
`DUPLICATE_TRANSACTION`, `422` for every eligibility-style business code, and
`500` (`POSTING_FAILED`) only for an unhandled failure where the transaction
was rolled back.
