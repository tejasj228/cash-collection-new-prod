# Shift reopen — start a new segment

```http
POST /api/cash-collection/shifts/{shiftId}/reopen
Idempotency-Key: <uuid>
```

Called when the clerk clicks **"Start Shift"** (same-day, after a normal
close) or **"Start today's shift"** (after closing a shift that had been
left open from an earlier day). `shiftId` is the ID from the just-closed
shift's response.

## Request body

| Field     | Type   | Notes                                                                    |
| --------- | ------ | ------------------------------------------------------------------------ |
| `version` | string | The closed shift's `version` — reject with `409 SHIFT_CHANGED` if stale. |

```json
{ "version": "v8-closed" }
```

Starts another segment **only for the same authenticated counter and
current business date**. Two concurrent reopen attempts must produce exactly
one new segment — the loser gets the idempotent replay of the winner's
result if it reused the same key, or a `409` if it used a different one
against an already-reopened shift.

## Response fields

| Field                   | Type           | Notes                                                                                                                   |
| ----------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `shiftId`               | string         | A **new** shift ID for the new segment.                                                                                 |
| `version`               | string         | New open-shift version.                                                                                                 |
| `businessDate`          | string         | Today's real business date.                                                                                             |
| `status`                | string         | `"OPEN"`.                                                                                                               |
| `segmentNumber`         | string of int  | Incremented from the closed shift's segment number.                                                                     |
| `previousSubmittedCash` | string decimal | Carried forward — the sum of everything already closed today (or across the stale day, per your reconciliation policy). |

## Example response

```json
{
  "success": true,
  "requestId": "trace-1301",
  "data": {
    "shiftId": "shift-2026-09-13-seat-4-seg2",
    "version": "v1",
    "businessDate": "2026-09-13",
    "status": "OPEN",
    "segmentNumber": "2",
    "previousSubmittedCash": "96672.00"
  }
}
```

Errors: `SHIFT_ALREADY_OPEN` (409, nothing to reopen), `SHIFT_CHANGED` (409,
stale `version`).
