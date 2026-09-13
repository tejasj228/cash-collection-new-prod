# Reprint a receipt — ⚠ proposed, not yet wired

## Current state

Two different "reprint" affordances exist in the UI, in two different states:

1. **Recent Transactions → "Reprint"** (per-row, in `DashboardPage.jsx`) —
   the button renders with **no `onClick` handler at all**. Clicking it does
   nothing today.
2. **Top nav → "Reprint Receipt"** (visible only once a shift has closed,
   `components/layout/Navigation.jsx`) — wired to a placeholder
   `window.print()` that reprints whatever's already rendered on screen. This
   one is intentionally a same-day "printer jammed" fallback for the shift
   report already visible, and doesn't need a new endpoint.

This file proposes the endpoint needed to make **(1)** real.

## Proposed endpoint

```http
GET /api/cash-collection/transactions/{no}/printable
```

`no` is the transaction's `no` (bill number).

### Why a fetch, not just re-rendering local data

`GET /transactions` rows are a **display-only summary** (patient name, CR,
amount, mode, status) — they don't carry the original tariff line items,
discount breakdown, or exact payment summary needed to reproduce the
original printed receipt. Reprinting must pull the **original persisted
`printableData`** snapshot from when the transaction was posted (see
[`post-transaction.md`](./09-post-transaction.md#printabledata)) — never
recompute it from current (possibly since-changed) tariff/patient data.

### Proposed response

Identical shape to `postTransaction`'s `printableData`:

```json
{
  "success": true,
  "requestId": "trace-1501",
  "data": {
    "documentNumber": "REC-2026-088241",
    "documentType": "Receipt",
    "documentDate": "13/09/2026",
    "patient": { "id": "4", "name": "Ajay Deshmukh", "cr": "939112600000004" },
    "lines": [
      {
        "code": "CONS-118",
        "name": "Consultation — General Medicine",
        "rate": 300,
        "qty": 1,
        "discount": 0
      }
    ],
    "payment": { "mode": "Cash", "summary": "Cash" },
    "totals": { "gross": "300.00", "discount": "0.00", "net": "300.00" }
  }
}
```

### Frontend change required

`DashboardPage.jsx`'s Reprint button needs an `onClick` that calls this
endpoint, populates `<PrintableBill/>` with the result, and calls
`window.print()` — the same pattern `CollectionWorkspace.jsx`'s
`postAndPrint()` already uses for the first print. Until then, the button is
non-functional; don't present it as a working feature in a real deployment.
