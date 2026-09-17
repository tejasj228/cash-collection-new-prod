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

| Field                           | Type             | Notes                                                                                                                                                                                    |
| ------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `collection_source`             | string           | `"request"` \| `"direct"`.                                                                                                                                                               |
| `req_no`                        | string, nullable | Present only when `collection_source: "request"`.                                                                                                                                        |
| `req_version`                   | string, nullable |                                                                                                                                                                                          |
| `request_type`                  | string           | `"Receipt"` \| `"Refund"` \| `"Estimation"`.                                                                                                                                             |
| `processing_billing_service_id` | string           | The chosen option's `processing_billing_service_id`. The server **re-resolves and verifies** this — never dispatches on the client's copy.                                               |
| `workflow_id`                   | string           | The chosen option's `workflow_family`.                                                                                                                                                   |
| `pat_id`                        | string, nullable |                                                                                                                                                                                          |
| `pat_context_version`           | string           | Must match the version [`checkEligibility`](./07-eligibility.md) returned — reject a stale one.                                                                                          |
| `workflow_fields`               | object           | The department/episode/category/ward/room IDs picked from `workflow_context` — every value must be one the eligibility response actually offered.                                        |
| `tariff_lines`                  | array            | `[{ tariff_code, tariff_name, tariff_rate, tariff_qty, tariff_discount_percent, tariff_source }]` — recompute gross/discount/net server-side per line; never trust the client's numbers. |
| `transaction_total`             | string decimal   | What the UI showed the clerk. Compare against your own recomputation; mismatch → `409 AMOUNT_CHANGED`.                                                                                   |
| `payment_details`               | object           | See below.                                                                                                                                                                               |
| `idempotency_key`               | string           | Also sent as the `Idempotency-Key` header — claim it before the financial write.                                                                                                         |

### `payment_details`

| Field                    | Type                                              | Notes                                                                                                                                                                                            |
| ------------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `payment_mode`           | string                                            | `"Cash"` \| `"Card"` \| `"UPI"` \| `"Cheque"`.                                                                                                                                                   |
| `payment_description`    | string                                            | Free-text note (required for Cheque).                                                                                                                                                            |
| `payment_summary`        | string                                            | Human-readable one-liner, printed on the receipt — e.g. `"Debit Card ending 4821 · T1 · Approval 024-088501"`. Treat as **display text only**; validate the structured fields it was built from. |
| `card_type`              | string, present for Card                          |                                                                                                                                                                                                  |
| `pos_terminal_id`        | string, present for Card/UPI                      |                                                                                                                                                                                                  |
| `terminal_payment`       | object, present for a successful terminal payment | The full [terminal-payment status response](./08-terminal-payments.md) — verify it belongs to this counter/terminal/amount and hasn't already been consumed.                                     |
| `manual_payment_details` | object, present for a manual fallback             | `{ bank_name, payment_reference, card_last_four, transaction_date, card_type, payment_summary }` — validate every field server-side; this is a verified fallback, not a free-text bypass.        |

### Example — Cash receipt

```json
{
  "collection_source": "request",
  "req_no": "BIL-2024-1200",
  "req_version": "1",
  "request_type": "Receipt",
  "processing_billing_service_id": "10",
  "workflow_id": "tariff-entry",
  "pat_id": "4",
  "pat_context_version": "patient-4-v1",
  "workflow_fields": {},
  "tariff_lines": [
    {
      "tariff_code": "CONS-118",
      "tariff_name": "Consultation — General Medicine",
      "tariff_group_name": "Consultation",
      "tariff_rate": 300,
      "tariff_qty": 1,
      "tariff_discount_percent": 0,
      "tariff_source": "request"
    },
    {
      "tariff_code": "INV-3312",
      "tariff_name": "ECG — 12 lead",
      "tariff_group_name": "Investigation",
      "tariff_rate": 180,
      "tariff_qty": 1,
      "tariff_discount_percent": 0,
      "tariff_source": "request"
    }
  ],
  "transaction_total": "480.00",
  "payment_details": {
    "payment_mode": "Cash",
    "payment_description": "",
    "payment_summary": "Cash"
  },
  "idempotency_key": "a1b2c3d4-0000-4000-8000-000000000000"
}
```

## Response — success

| Field                       | Type             | Notes                                                                                                                                           |
| --------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `transaction_document_no`   | string           | The authoritative receipt/refund/estimate number (e.g. `"REC-2026-088241"`, `"REF-…"`, `"EST-…"`). The frontend refuses to proceed without one. |
| `transaction_status`        | string           | `"Completed"` for Receipt, or your equivalent for Refund/Estimation.                                                                            |
| `resolved_req_no`           | string, nullable | Echo the source request's ID so the frontend can remove it from the in-memory queue immediately.                                                |
| `printable_data`            | object           | **Required, complete.** The frontend builds the printed receipt from this and nothing else.                                                     |
| `dashboard_transaction_row` | object, nullable | The row to prepend to the in-memory transactions list (omit/`null` for Estimation, which never posts a ledger row). Shape below.                |

### `printable_data`

| Field                                | Type           | Notes                                                        |
| ------------------------------------ | -------------- | ------------------------------------------------------------ |
| `transaction_document_type`          | string         | Echo `request_type`.                                         |
| `transaction_document_date`          | string         | `DD/MM/YYYY`.                                                |
| `patient_details`                    | object         | The full patient object, for the receipt header.             |
| `tariff_lines`                       | array          | The final, server-recomputed charge lines.                   |
| `payment_details`                    | object         | Echo of the request's `payment_details`.                     |
| `transaction_totals.gross_amount`    | string decimal |                                                              |
| `transaction_totals.discount_amount` | string decimal |                                                              |
| `transaction_totals.net_amount`      | string decimal | Must equal `transaction_document_no`'s actual posted amount. |

### `dashboard_transaction_row` — the row that feeds every dashboard chart

This is the same row shape as [`GET /transactions`](./10-transactions-list.md#response-fields)
— **including** `hospital_service_name` and `billing_service_name`, which is how the
dashboard's OPD/IPD/Emergency billing-service treemap gets its data. Derive
them from `hospital_service_id`/`billing_service_name` using the same mapping
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
  "trace_id": "trace-801",
  "data": {
    "transaction_document_no": "REC-2026-088241",
    "transaction_status": "Completed",
    "resolved_req_no": "BIL-2024-1200",
    "dashboard_transaction_row": {
      "transaction_no": "REC-2026-088241",
      "pat_name": "Ajay Deshmukh",
      "cr_num": "939112600000004",
      "transaction_date_iso": "2026-09-13",
      "transaction_time": "10:38 AM",
      "payment_mode": "Cash",
      "transaction_amount": "480.00",
      "transaction_status": "Completed",
      "department_name": "Cardiology",
      "category_name": "General",
      "req_type": "Service",
      "hospital_service_name": "OPD",
      "billing_service_name": "Service"
    },
    "printable_data": {
      "transaction_document_type": "Receipt",
      "transaction_document_date": "13/09/2026",
      "patient_details": {
        "pat_id": "4",
        "pat_name": "Ajay Deshmukh",
        "cr_num": "939112600000004",
        "episode_name": "IPD / Cardiology"
      },
      "tariff_lines": [
        {
          "tariff_code": "CONS-118",
          "tariff_name": "Consultation — General Medicine",
          "tariff_rate": 300,
          "tariff_qty": 1,
          "tariff_discount_percent": 0
        },
        {
          "tariff_code": "INV-3312",
          "tariff_name": "ECG — 12 lead",
          "tariff_rate": 180,
          "tariff_qty": 1,
          "tariff_discount_percent": 0
        }
      ],
      "payment_details": { "payment_mode": "Cash", "payment_summary": "Cash" },
      "transaction_totals": {
        "gross_amount": "480.00",
        "discount_amount": "0.00",
        "net_amount": "480.00"
      }
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
  "trace_id": "trace-802",
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
