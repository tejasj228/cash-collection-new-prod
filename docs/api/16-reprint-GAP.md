# Reprint a receipt — ⚠ proposed, not yet wired

## Current state

Two different "reprint" affordances exist in the UI, in two different states:

1. **Recent Transactions → "Reprint"** (per-row, in `Dashboard/Dashboard.jsx`) —
   the button renders with **no `onClick` handler at all**. Clicking it does
   nothing today.
2. **Top nav → "Reprint Receipt"** (visible only once a shift has closed,
   `CashCollection/CashCollection.jsx`) — wired to a placeholder
   `window.print()` that reprints whatever's already rendered on screen. This
   one is intentionally a same-day "printer jammed" fallback for the shift
   report already visible, and doesn't need a new endpoint.

This file proposes the endpoint needed to make **(1)** real.

## Proposed endpoint

```http
GET /api/cash-collection/transactions/{transaction_no}/printable
```

`transaction_no` is the transaction's bill number.

### Why a fetch, not just re-rendering local data

`GET /transactions` rows are a **display-only summary** (patient name, CR,
amount, mode, status) — they don't carry the original tariff line items,
discount breakdown, or exact payment summary needed to reproduce the
original printed receipt. Reprinting must pull the **original persisted
`printable_data`** snapshot from when the transaction was posted (see
[`post-transaction.md`](./09-post-transaction.md#printable_data)) — never
recompute it from current (possibly since-changed) tariff/patient data.

### Proposed response

Identical shape to `postTransaction`'s `printable_data`:

```json
{
  "success": true,
  "trace_id": "trace-1501",
  "data": {
    "transaction_document_no": "REC-2026-088241",
    "transaction_document_type": "Receipt",
    "transaction_document_date": "13/09/2026",
    "patient_details": {
      "pat_id": "4",
      "pat_name": "Ajay Deshmukh",
      "cr_num": "939112600000004"
    },
    "tariff_lines": [
      {
        "tariff_code": "CONS-118",
        "tariff_name": "Consultation — General Medicine",
        "tariff_rate": 300,
        "tariff_qty": 1,
        "tariff_discount_percent": 0
      }
    ],
    "payment_details": { "payment_mode": "Cash", "payment_summary": "Cash" },
    "transaction_totals": {
      "gross_amount": "300.00",
      "discount_amount": "0.00",
      "net_amount": "300.00"
    }
  }
}
```

### Frontend change required

`Dashboard/Dashboard.jsx`'s Reprint button needs an `onClick` that calls this
endpoint, populates `<PrintableBill/>` with the result, and calls
`window.print()` — the same pattern `CollectionDetails/CollectionDetails.jsx`'s
`postAndPrint()` already uses for the first print. Until then, the button is
non-functional; don't present it as a working feature in a real deployment.
