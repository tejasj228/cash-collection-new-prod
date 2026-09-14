# Shift close — commit

```http
POST /api/cash-collection/shifts/{shift_id}/close
Idempotency-Key: <uuid>
```

Called when the clerk confirms **"End shift"** on the second (recap)
screen. `shift_id` is the value from
[close-preparation](./12-shift-close-preparation.md).

## Request body

| Field                 | Type   | Notes                                                                                                |
| --------------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| `shift_version`       | string | Echoed from close-preparation — reject with `409 SHIFT_CHANGED` if it no longer matches.             |
| `reconciliation_mode` | string | `"DENOMINATION"` \| `"SKIPPED"`.                                                                     |
| `denomination_counts` | array  | `[{ denomination_code, denomination_quantity }]`. Empty array when `reconciliation_mode: "SKIPPED"`. |

```json
{
  "shift_version": "v7",
  "reconciliation_mode": "DENOMINATION",
  "denomination_counts": [
    { "denomination_code": "NOTE_500", "denomination_quantity": 150 },
    { "denomination_code": "NOTE_200", "denomination_quantity": 83 },
    { "denomination_code": "COIN_10", "denomination_quantity": 12 }
  ]
}
```

**Even when `reconciliation_mode` is `"SKIPPED"`,** re-verify the
authoritative current-segment and cumulative cash amounts server-side and
record that the count was skipped — "skipped" means the clerk didn't count
notes and coins, not that the server stops checking. With `"DENOMINATION"`,
resolve every denomination value by `denomination_code` again server-side (never trust a
client-sent value) and require the counted total to equal the current
segment's `expected_cash_amount` before committing.

Do **not** accept hospital code, seat ID, counter ID, expected cash,
denomination values, the calculated total, day-end mode, or a summary number
as trusted fields from the browser, even if a client sends them.

## Response fields

| Field                            | Type                     | Notes                                                                                                               |
| -------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `shift_id`                       | string                   | Echoed.                                                                                                             |
| `shift_status`                   | string                   | `"CLOSED"`.                                                                                                         |
| `shift_business_date`            | string                   | Echoed from preparation.                                                                                            |
| `shift_closed_at`                | string                   | ISO 8601 timestamp.                                                                                                 |
| `expected_cash_amount`           | string decimal           | This segment's expected cash (echoed from preparation).                                                             |
| `counted_cash_amount`            | string decimal, nullable | `null` when `reconciliation_mode: "SKIPPED"`.                                                                       |
| `reconciliation_mode`            | string                   | Echoed.                                                                                                             |
| `previous_submitted_cash_amount` | string decimal           | Echoed from preparation.                                                                                            |
| `cumulative_cash_amount`         | string decimal           | `previous_submitted_cash_amount + expected_cash_amount` — the value actually submitted to the legacy day-end write. |
| `shift_version`                  | string                   | **New** version — required to reopen.                                                                               |
| `shift_segment_number`           | string of int            | Echoed.                                                                                                             |
| `shift_summary_number`           | string                   | The legacy day-end summary/reference number, if one is generated.                                                   |

## Example response

```json
{
  "success": true,
  "trace_id": "trace-1201",
  "data": {
    "shift_id": "shift-2026-09-13-seat-4",
    "shift_status": "CLOSED",
    "shift_business_date": "2026-09-13",
    "shift_closed_at": "2026-09-13T18:32:10+05:30",
    "expected_cash_amount": "96672.00",
    "counted_cash_amount": "96672.00",
    "reconciliation_mode": "DENOMINATION",
    "previous_submitted_cash_amount": "0.00",
    "cumulative_cash_amount": "96672.00",
    "shift_version": "v8-closed",
    "shift_segment_number": "1",
    "shift_summary_number": "DAYEND-2026-09-13-004"
  }
}
```

## Idempotency and conflicts

A retry with the same `Idempotency-Key` returns the identical result without
writing twice. Recommended error codes: `SHIFT_ALREADY_CLOSED` (409),
`SHIFT_CHANGED` (409, stale `shift_version`), `CASH_MISMATCH` (409, counted total
doesn't match expected), `PENDING_TRANSACTIONS` (409, an in-flight POS
payment blocks closing), `DAY_END_NOT_ALLOWED` (409).
