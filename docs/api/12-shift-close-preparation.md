# Shift close — preparation

```http
GET /api/cash-collection/shifts/current/close-preparation
```

Called the instant a clerk clicks **"End Shift"**. Read-only — performs no
write. Resolves the active shift from the authenticated session (never from
a request parameter) and re-reads the legacy cash amount fresh.

## Response fields

| Field                    | Type           | Notes                                                                                                                                                                                                                                                                                                                                    |
| ------------------------ | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shiftId`                | string         | Opaque.                                                                                                                                                                                                                                                                                                                                  |
| `version`                | string         | Opaque concurrency token — must be echoed back unchanged to close.                                                                                                                                                                                                                                                                       |
| `businessDate`           | string         | `YYYY-MM-DD`. **The real calendar date this shift segment opened on** — not always "today". This is the field that drives the frontend's "you left a shift open overnight" messaging (`ShiftEndDialog.jsx`'s `isStaleShift`). Getting this right retires a `localStorage`-based workaround in the frontend — see `PROJECT_GUIDE.md` §10. |
| `status`                 | string         | `"OPEN"`.                                                                                                                                                                                                                                                                                                                                |
| `canClose`               | boolean        | `false` if a blocker prevents closing.                                                                                                                                                                                                                                                                                                   |
| `blockers`               | array          | `[{ code, message, count? }]` — e.g. a pending terminal payment. Shown to the clerk verbatim if `canClose` is `false`.                                                                                                                                                                                                                   |
| `expectedCash`           | string decimal | Cash owed/expected for **this open segment only**. Can be negative on a refund-heavy segment.                                                                                                                                                                                                                                            |
| `previousSubmittedCash`  | string decimal | Sum of all **already-closed** segments today. `0.00` for the first shift of the day.                                                                                                                                                                                                                                                     |
| `cumulativeExpectedCash` | string decimal | `previousSubmittedCash + expectedCash` — what actually gets submitted to the legacy day-end write.                                                                                                                                                                                                                                       |
| `segmentNumber`          | string of int  | `"1"` for the first shift of the day, increments on each reopen.                                                                                                                                                                                                                                                                         |
| `denominations`          | array          | See below — every note/coin denomination this counter counts.                                                                                                                                                                                                                                                                            |

### `denominations[]`

| Field   | Type           | Notes                                                                         |
| ------- | -------------- | ----------------------------------------------------------------------------- |
| `code`  | string         | Server-owned stable code, e.g. `"NOTE_500"`, `"COIN_20"`.                     |
| `kind`  | string         | `"NOTE"` \| `"COIN"`.                                                         |
| `value` | string decimal | e.g. `"500.00"` or `"500"` — the frontend accepts either, just be consistent. |
| `label` | string         | Shown next to the input, e.g. `"₹500"`.                                       |

Errors: `SHIFT_ALREADY_CLOSED` (409) if there's no open shift to prepare.

## Example response

```json
{
  "success": true,
  "requestId": "trace-1101",
  "data": {
    "shiftId": "shift-2026-09-13-seat-4",
    "version": "v7",
    "businessDate": "2026-09-13",
    "status": "OPEN",
    "canClose": true,
    "blockers": [],
    "expectedCash": "96672.00",
    "previousSubmittedCash": "0.00",
    "cumulativeExpectedCash": "96672.00",
    "segmentNumber": "1",
    "denominations": [
      { "code": "NOTE_500", "kind": "NOTE", "value": "500", "label": "₹500" },
      { "code": "NOTE_200", "kind": "NOTE", "value": "200", "label": "₹200" },
      { "code": "NOTE_100", "kind": "NOTE", "value": "100", "label": "₹100" },
      { "code": "NOTE_50", "kind": "NOTE", "value": "50", "label": "₹50" },
      { "code": "NOTE_20", "kind": "NOTE", "value": "20", "label": "₹20" },
      { "code": "NOTE_10", "kind": "NOTE", "value": "10", "label": "₹10" },
      { "code": "COIN_20", "kind": "COIN", "value": "20", "label": "₹20" },
      { "code": "COIN_10", "kind": "COIN", "value": "10", "label": "₹10" },
      { "code": "COIN_5", "kind": "COIN", "value": "5", "label": "₹5" },
      { "code": "COIN_2", "kind": "COIN", "value": "2", "label": "₹2" },
      { "code": "COIN_1", "kind": "COIN", "value": "1", "label": "₹1" }
    ]
  }
}
```
