# Shift close — commit

```http
POST /api/cash-collection/shifts/{shiftId}/close
Idempotency-Key: <uuid>
```

Called when the clerk confirms **"End shift"** on the second (recap)
screen. `shiftId` is the value from
[close-preparation](./12-shift-close-preparation.md).

## Request body

| Field                | Type   | Notes                                                                                    |
| -------------------- | ------ | ---------------------------------------------------------------------------------------- |
| `version`            | string | Echoed from close-preparation — reject with `409 SHIFT_CHANGED` if it no longer matches. |
| `reconciliationMode` | string | `"DENOMINATION"` \| `"SKIPPED"`.                                                         |
| `denominations`      | array  | `[{ code, quantity }]`. Empty array when `reconciliationMode: "SKIPPED"`.                |

```json
{
  "version": "v7",
  "reconciliationMode": "DENOMINATION",
  "denominations": [
    { "code": "NOTE_500", "quantity": 150 },
    { "code": "NOTE_200", "quantity": 83 },
    { "code": "COIN_10", "quantity": 12 }
  ]
}
```

**Even when `reconciliationMode` is `"SKIPPED"`,** re-verify the
authoritative current-segment and cumulative cash amounts server-side and
record that the count was skipped — "skipped" means the clerk didn't count
notes and coins, not that the server stops checking. With `"DENOMINATION"`,
resolve every denomination value by `code` again server-side (never trust a
client-sent value) and require the counted total to equal the current
segment's `expectedCash` before committing.

Do **not** accept hospital code, seat ID, counter ID, expected cash,
denomination values, the calculated total, day-end mode, or a summary number
as trusted fields from the browser, even if a client sends them.

## Response fields

| Field                   | Type                     | Notes                                                                                              |
| ----------------------- | ------------------------ | -------------------------------------------------------------------------------------------------- |
| `shiftId`               | string                   | Echoed.                                                                                            |
| `status`                | string                   | `"CLOSED"`.                                                                                        |
| `businessDate`          | string                   | Echoed from preparation.                                                                           |
| `closedAt`              | string                   | ISO 8601 timestamp.                                                                                |
| `expectedCash`          | string decimal           | This segment's expected cash (echoed from preparation).                                            |
| `countedCash`           | string decimal, nullable | `null` when `reconciliationMode: "SKIPPED"`.                                                       |
| `reconciliationMode`    | string                   | Echoed.                                                                                            |
| `previousSubmittedCash` | string decimal           | Echoed from preparation.                                                                           |
| `cumulativeCash`        | string decimal           | `previousSubmittedCash + expectedCash` — the value actually submitted to the legacy day-end write. |
| `version`               | string                   | **New** version — required to reopen.                                                              |
| `segmentNumber`         | string of int            | Echoed.                                                                                            |
| `summaryNumber`         | string                   | The legacy day-end summary/reference number, if one is generated.                                  |

## Example response

```json
{
  "success": true,
  "requestId": "trace-1201",
  "data": {
    "shiftId": "shift-2026-09-13-seat-4",
    "status": "CLOSED",
    "businessDate": "2026-09-13",
    "closedAt": "2026-09-13T18:32:10+05:30",
    "expectedCash": "96672.00",
    "countedCash": "96672.00",
    "reconciliationMode": "DENOMINATION",
    "previousSubmittedCash": "0.00",
    "cumulativeCash": "96672.00",
    "version": "v8-closed",
    "segmentNumber": "1",
    "summaryNumber": "DAYEND-2026-09-13-004"
  }
}
```

## Idempotency and conflicts

A retry with the same `Idempotency-Key` returns the identical result without
writing twice. Recommended error codes: `SHIFT_ALREADY_CLOSED` (409),
`SHIFT_CHANGED` (409, stale `version`), `CASH_MISMATCH` (409, counted total
doesn't match expected), `PENDING_TRANSACTIONS` (409, an in-flight POS
payment blocks closing), `DAY_END_NOT_ALLOWED` (409).
