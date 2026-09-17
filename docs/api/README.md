# API documentation index

Every business field follows the strict prefixes in
[`00-field-naming.md`](./00-field-naming.md). One file per endpoint. Every table, dropdown, dashboard chart, and popup in
the app is backed by one of these. Read [`docs/PROJECT_GUIDE.md`](../PROJECT_GUIDE.md)
first for the big picture — this folder is the exact wire-format reference
you implement against.

| #   | File                                                                | Endpoint                                                                      | Used by                                                                       |
| --- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 00  | [field-naming.md](./00-field-naming.md)                             | Shared wire-format rule                                                       | All endpoints                                                                 |
| 01  | [bootstrap.md](./01-bootstrap.md)                                   | `GET /bootstrap`                                                              | Whole app, on load                                                            |
| 02  | [pending-requests.md](./02-pending-requests.md)                     | `GET /requests`, `GET /dashboard/pending-metrics`                             | Pending Requests table + filter panel                                         |
| 03  | [request-detail.md](./03-request-detail.md)                         | `GET /requests/{req_no}`                                                      | Opening a queued request                                                      |
| 04  | [patient-search.md](./04-patient-search.md)                         | `GET /patients`                                                               | CR lookup popover, IPD "Existing Patients" list                               |
| 05  | [tariffs.md](./05-tariffs.md)                                       | `GET /tariffs`                                                                | Tariff group dropdown + live tariff search                                    |
| 06  | [payment-options.md](./06-payment-options.md)                       | `GET /payment-options`                                                        | Payment mode / card type / POS terminal dropdowns                             |
| 07  | [eligibility.md](./07-eligibility.md)                               | `POST /eligibility`                                                           | "Continue" on Direct Collection, opening a request                            |
| 08  | [terminal-payments.md](./08-terminal-payments.md)                   | `POST /terminal-payments`, `GET /terminal-payments/{terminal_transaction_id}` | Card/UPI POS flow                                                             |
| 09  | [post-transaction.md](./09-post-transaction.md)                     | `POST /transactions`                                                          | Collect / Refund / Estimate "Proceed"                                         |
| 10  | [transactions-list.md](./10-transactions-list.md)                   | `GET /transactions`                                                           | Recent Transactions table + every dashboard chart                             |
| 11  | [dashboard.md](./11-dashboard.md)                                   | `GET /dashboard`                                                              | Server-side dashboard aggregation (defined, not yet called — see note inside) |
| 12  | [shift-close-preparation.md](./12-shift-close-preparation.md)       | `GET /shifts/current/close-preparation`                                       | Clicking "End Shift"                                                          |
| 13  | [shift-close.md](./13-shift-close.md)                               | `POST /shifts/{shift_id}/close`                                               | Confirming "End shift"                                                        |
| 14  | [shift-reopen.md](./14-shift-reopen.md)                             | `POST /shifts/{shift_id}/reopen`                                              | "Start Shift" / "Start today's shift"                                         |
| 15  | [cancel-transaction-GAP.md](./15-cancel-transaction-GAP.md)         | _proposed_ `POST /transactions/{transaction_no}/cancel`                       | Recent Transactions "Cancel bill" (currently client-only)                     |
| 16  | [reprint-GAP.md](./16-reprint-GAP.md)                               | _proposed_ `GET /transactions/{transaction_no}/printable`                     | Recent Transactions "Reprint" (currently unwired)                             |
| 17  | [legacy-hbims-bridge-STAGED.md](./17-legacy-hbims-bridge-STAGED.md) | _temporary_ raw HBIMS `pendinglist`                                           | Pending Requests table                                                        |
| 18  | [patient-tile-STAGED.md](./18-patient-tile-STAGED.md)               | active raw HBIMS `patinfo`; target `GET /patients/{cr_num}/tile`              | Compact patient header only                                                   |
| 19  | [request-tariff-details.md](./19-request-tariff-details.md)         | target `GET /requests/{req_no}/tariff-details`                                | OPD/IPD tariff lines + IPD-only settlement context                            |

## Conventions used in every file below

**Envelope.** Every successful response is wrapped exactly like this:

```json
{
  "success": true,
  "trace_id": "trace-123",
  "data": { "...": "the shape documented below" }
}
```

Every failed response:

```json
{
  "success": false,
  "trace_id": "trace-123",
  "error": {
    "code": "SOME_CODE",
    "message": "Shown to the clerk as-is.",
    "fieldErrors": {}
  }
}
```

`trace_id` is a server correlation ID for support/debugging — it is not a
business identifier and is never displayed.

**Strings, not numbers.** Every amount, count, percentage, CR number, bill
number and version token is a JSON **string**, matching the underlying
database's `character varying` columns: `"transaction_amount": "480.00"`, never
`"transaction_amount": 480`. `page`, `size`, and `total` in a paginated envelope are the
one exception — those are real JSON integers.

**Dates.** `req_date` fields use `DD/MM/YYYY`. `transaction_date_iso`,
`business_date`, and `shift_business_date` use `YYYY-MM-DD`. Times use
`h:mm AM/PM` (e.g. `"10:38 AM"`).

**Pagination.** `page` is zero-based. `GET /requests?page=0&size=10` returns
the first 10 rows. A page response always has the shape
`{ items: [...], total, page, size }`, and `total` is the count across the
**entire filtered result**, not just the returned page.

**Opaque values.** `cr_num`, `req_no`, `req_version`, `shift_id`,
`shift_version`, `hospital_service_id`, `billing_service_id`, and
`pat_context_version` are values the browser only ever echoes back — never
parse it, never derive meaning from its format, never generate one on the
frontend. CR numbers, admission numbers and account numbers are the same:
opaque display strings the backend owns.

**Auth.** Every endpoint uses the existing session cookie
(`credentials: "include"` on every fetch — see
[`docs/PROJECT_GUIDE.md` §4](../PROJECT_GUIDE.md#4-runtime-and-session-configuration)).
There is no bearer token and no field in any request body that identifies
the hospital, seat, counter or user — all of that comes from the
server-resolved session on every single call.
