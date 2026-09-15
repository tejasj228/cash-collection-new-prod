# Cancel a transaction — ⚠ proposed, not yet in the contract

## Current state

The **"Cancel bill"** button in Recent Transactions is wired to a purely
**client-side** action today. `CashCollection/CashCollection.jsx`'s `cancelBill(no)`
just patches the row to `status: "Cancelled"` in local React state
(`txPatches`) — nothing is sent to a server, and a page reload silently
un-cancels it. `contracts/openapi.yaml` has no cancel operation at all. This
file proposes the endpoint needed to make the button real.

## Proposed endpoint

```http
POST /api/cash-collection/transactions/{transaction_no}/cancel
```

`transaction_no` is the transaction's `transaction_no` (bill number) from
[`GET /transactions`](./10-transactions-list.md).

### Request body

| Field                       | Type             | Notes                                                                                                                                         |
| --------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `transaction_version`       | string           | If you add a concurrency version to transaction rows (recommended), require it here to prevent cancelling a transaction that already changed. |
| `transaction_cancel_reason` | string, optional | Free-text reason, for audit.                                                                                                                  |
| `idempotency_key`           | string           | Same pattern as posting — a cancel is also a financial-ledger write.                                                                          |

### What the backend must actually do

Cancelling a posted receipt is not just flipping a status flag — depending
on your legacy ledger rules, it may need to reverse the cash position the
same way a refund does. Before implementing, confirm with the HBIMS billing
domain owner whether "Cancel bill" should:

- reverse the ledger entry entirely (as if it never happened), or
- record it as a distinct `Cancelled` state that still appears in reports
  with a zeroed net effect.

Whichever is chosen, `dashboard_kpis.cash_in_drawer_amount` (§[`dashboard.md`](./11-dashboard.md))
and the shift-close `expected_cash_amount` (§[`shift-close-preparation.md`](./12-shift-close-preparation.md))
must reflect it consistently — a cancelled cash bill should no longer count
toward the drawer total the same shift reconciles against.

### Proposed response

```json
{
  "success": true,
  "trace_id": "trace-1401",
  "data": {
    "transaction_no": "REC-2026-088241",
    "transaction_status": "Cancelled",
    "transaction_cancelled_at": "2026-09-13T11:02:00+05:30"
  }
}
```

### Frontend change required

`Dashboard/` (`Dashboard/Dashboard.jsx`'s Cancel-bill confirm dialog,
currently calling straight into `onCancelBill(row.no)` →
`CashCollection/CashCollection.jsx`'s local `cancelBill()`) needs its confirm
handler changed to call this endpoint and only patch local state on success
— mirroring how `postTransaction` already works. Until then, treat cancel as
demo-only; do not rely on it in front of real money.
