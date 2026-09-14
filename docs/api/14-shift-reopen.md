# Shift reopen — start a new segment

```http
POST /api/cash-collection/shifts/{shift_id}/reopen
Idempotency-Key: <uuid>
```

Called when the clerk clicks **"Start Shift"** (same-day, after a normal
close) or **"Start today's shift"** (after closing a shift that had been
left open from an earlier day). `shift_id` is the ID from the just-closed
shift's response.

## Request body

| Field           | Type   | Notes                                                                          |
| --------------- | ------ | ------------------------------------------------------------------------------ |
| `shift_version` | string | The closed shift's `shift_version` — reject with `409 SHIFT_CHANGED` if stale. |

```json
{ "shift_version": "v8-closed" }
```

Starts another segment **only for the same authenticated counter and
current business date**. Two concurrent reopen attempts must produce exactly
one new segment — the loser gets the idempotent replay of the winner's
result if it reused the same key, or a `409` if it used a different one
against an already-reopened shift.

## Response fields

| Field                            | Type           | Notes                                                                                                                   |
| -------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `shift_id`                       | string         | A **new** shift ID for the new segment.                                                                                 |
| `shift_version`                  | string         | New open-shift version.                                                                                                 |
| `shift_business_date`            | string         | Today's real business date.                                                                                             |
| `shift_status`                   | string         | `"OPEN"`.                                                                                                               |
| `shift_segment_number`           | string of int  | Incremented from the closed shift's segment number.                                                                     |
| `previous_submitted_cash_amount` | string decimal | Carried forward — the sum of everything already closed today (or across the stale day, per your reconciliation policy). |

## Example response

```json
{
  "success": true,
  "trace_id": "trace-1301",
  "data": {
    "shift_id": "shift-2026-09-13-seat-4-seg2",
    "shift_version": "v1",
    "shift_business_date": "2026-09-13",
    "shift_status": "OPEN",
    "shift_segment_number": "2",
    "previous_submitted_cash_amount": "96672.00"
  }
}
```

Errors: `SHIFT_ALREADY_OPEN` (409, nothing to reopen), `SHIFT_CHANGED` (409,
stale `shift_version`).
