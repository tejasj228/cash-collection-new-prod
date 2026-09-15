# Shift close — preparation

```http
GET /api/cash-collection/shifts/current/close-preparation
```

Called the instant a clerk clicks **"End Shift"**. Read-only — performs no
write. Resolves the active shift from the authenticated session (never from
a request parameter) and re-reads the legacy cash amount fresh.

## Response fields

| Field                             | Type           | Notes                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shift_id`                        | string         | Opaque.                                                                                                                                                                                                                                                                                                                               |
| `shift_version`                   | string         | Opaque concurrency token — must be echoed back unchanged to close.                                                                                                                                                                                                                                                                    |
| `shift_business_date`             | string         | `YYYY-MM-DD`. **The real calendar date this shift segment opened on** — not always "today". This is the field that drives the frontend's "you left a shift open overnight" messaging (`Shift/Shift.jsx`'s `isStaleShift`). Getting this right retires a `localStorage`-based workaround in the frontend — see `PROJECT_GUIDE.md` §10. |
| `shift_status`                    | string         | `"OPEN"`.                                                                                                                                                                                                                                                                                                                             |
| `can_close_shift`                 | boolean        | `false` if a blocker prevents closing.                                                                                                                                                                                                                                                                                                |
| `shift_blockers`                  | array          | `[{ shift_blocker_code, shift_blocker_message, shift_blocker_count? }]` — e.g. a pending terminal payment. Shown to the clerk verbatim if `can_close_shift` is `false`.                                                                                                                                                               |
| `expected_cash_amount`            | string decimal | Cash owed/expected for **this open segment only**. Can be negative on a refund-heavy segment.                                                                                                                                                                                                                                         |
| `previous_submitted_cash_amount`  | string decimal | Sum of all **already-closed** segments today. `0.00` for the first shift of the day.                                                                                                                                                                                                                                                  |
| `cumulative_expected_cash_amount` | string decimal | `previous_submitted_cash_amount + expected_cash_amount` — what actually gets submitted to the legacy day-end write.                                                                                                                                                                                                                   |
| `shift_segment_number`            | string of int  | `"1"` for the first shift of the day, increments on each reopen.                                                                                                                                                                                                                                                                      |
| `denomination_options`            | array          | See below — every note/coin denomination this counter counts.                                                                                                                                                                                                                                                                         |

### `denomination_options[]`

| Field                | Type           | Notes                                                                         |
| -------------------- | -------------- | ----------------------------------------------------------------------------- |
| `denomination_code`  | string         | Server-owned stable code, e.g. `"NOTE_500"`, `"COIN_20"`.                     |
| `denomination_kind`  | string         | `"NOTE"` \| `"COIN"`.                                                         |
| `denomination_value` | string decimal | e.g. `"500.00"` or `"500"` — the frontend accepts either, just be consistent. |
| `denomination_label` | string         | Shown next to the input, e.g. `"₹500"`.                                       |

Errors: `SHIFT_ALREADY_CLOSED` (409) if there's no open shift to prepare.

## Example response

```json
{
  "success": true,
  "trace_id": "trace-1101",
  "data": {
    "shift_id": "shift-2026-09-13-seat-4",
    "shift_version": "v7",
    "shift_business_date": "2026-09-13",
    "shift_status": "OPEN",
    "can_close_shift": true,
    "shift_blockers": [],
    "expected_cash_amount": "96672.00",
    "previous_submitted_cash_amount": "0.00",
    "cumulative_expected_cash_amount": "96672.00",
    "shift_segment_number": "1",
    "denomination_options": [
      {
        "denomination_code": "NOTE_500",
        "denomination_kind": "NOTE",
        "denomination_value": "500",
        "denomination_label": "₹500"
      },
      {
        "denomination_code": "NOTE_200",
        "denomination_kind": "NOTE",
        "denomination_value": "200",
        "denomination_label": "₹200"
      },
      {
        "denomination_code": "NOTE_100",
        "denomination_kind": "NOTE",
        "denomination_value": "100",
        "denomination_label": "₹100"
      },
      {
        "denomination_code": "NOTE_50",
        "denomination_kind": "NOTE",
        "denomination_value": "50",
        "denomination_label": "₹50"
      },
      {
        "denomination_code": "NOTE_20",
        "denomination_kind": "NOTE",
        "denomination_value": "20",
        "denomination_label": "₹20"
      },
      {
        "denomination_code": "NOTE_10",
        "denomination_kind": "NOTE",
        "denomination_value": "10",
        "denomination_label": "₹10"
      },
      {
        "denomination_code": "COIN_20",
        "denomination_kind": "COIN",
        "denomination_value": "20",
        "denomination_label": "₹20"
      },
      {
        "denomination_code": "COIN_10",
        "denomination_kind": "COIN",
        "denomination_value": "10",
        "denomination_label": "₹10"
      },
      {
        "denomination_code": "COIN_5",
        "denomination_kind": "COIN",
        "denomination_value": "5",
        "denomination_label": "₹5"
      },
      {
        "denomination_code": "COIN_2",
        "denomination_kind": "COIN",
        "denomination_value": "2",
        "denomination_label": "₹2"
      },
      {
        "denomination_code": "COIN_1",
        "denomination_kind": "COIN",
        "denomination_value": "1",
        "denomination_label": "₹1"
      }
    ]
  }
}
```
