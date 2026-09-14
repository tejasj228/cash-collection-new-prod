# Pending Requests table

```http
GET /api/cash-collection/requests?page=0&size=10
```

Powers the **Pending Requests** table on the Collection screen — the search
box, the Filter panel (Charge Type / Department), sorting, and pagination
are all server-side.

## Query parameters

| Param             | Type    | Notes                                                                                                                 |
| ----------------- | ------- | --------------------------------------------------------------------------------------------------------------------- |
| `page`            | integer | Zero-based.                                                                                                           |
| `size`            | integer | Rows per page. The UI always requests `10`.                                                                           |
| `req_search`      | string  | Matches patient name, CR number, or request number.                                                                   |
| `req_charge_type` | string  | Exact match against one of `request_filter_options.request_charge_types` from bootstrap. Omit for "All Charge Types". |
| `department_name` | string  | Exact match against one of `request_filter_options.department_names`. Omit for "All Departments".                     |
| `category_name`   | string  | Patient category, exact match. Not currently exposed as a UI filter but supported.                                    |
| `req_date`        | string  | `YYYY-MM-DD`. Not currently exposed as a UI filter but supported.                                                     |
| `req_sort`        | string  | `"req_date,desc"` or `"req_amount,asc"` — only `req_date` and `req_amount` are used today.                            |

Return only the requested page **and** the total count for the authenticated
user's authorized counter scope — never the whole table.

## Response fields — return these exact names

| Column shown  | Field name        | Notes                                                                                                                                                                                      |
| ------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Req No.       | `req_id`          | Unique request number, used to open the request.                                                                                                                                           |
| Req Date      | `req_date`        | `DD/MM/YYYY`, e.g. `"09/09/2026"`.                                                                                                                                                         |
| Patient Name  | `pat_name`        |                                                                                                                                                                                            |
| Department    | `department_name` |                                                                                                                                                                                            |
| CR No.        | `cr_num`          | String — never strip or reformat; the UI does display-only compaction.                                                                                                                     |
| Charge Type   | `req_charge_type` | One of the 7 `RequestChargeType` values (`OPD Service`, `OPD Refund`, `IPD Advance Deposit`, `IPD Advance Refund`, `IPD Final Adjustment`, `Investigation Charges`, `Package Collection`). |
| Amount        | `req_amount`      | Decimal string, no currency symbol, e.g. `"480.00"`.                                                                                                                                       |
| _(not shown)_ | `req_version`     | Opaque concurrency token, re-sent when the request is opened/posted.                                                                                                                       |
| _(not shown)_ | `category_name`   | Patient category — used by the dashboard's cross-filtering, not shown as a queue column.                                                                                                   |

Every property in a row is a **JSON string** — do not return JSON numbers for
`req_amount`, `cr_num`, or `req_version`. `req_date` uses `DD/MM/YYYY`; a separate
ISO date is not required for this endpoint (the frontend derives it). The
outer `trace_id` is an API trace ID, not the row's request number — don't
confuse the two.

Any `requests` rows included in [bootstrap](./01-bootstrap.md) use this same
field-name set.

## Example response

```json
{
  "success": true,
  "trace_id": "trace-123",
  "data": {
    "items": [
      {
        "req_id": "REQ-100001",
        "req_date": "09/09/2026",
        "pat_name": "Example Patient",
        "department_name": "General Medicine",
        "cr_num": "939112600000001",
        "req_charge_type": "OPD Service",
        "req_amount": "480.00",
        "req_version": "1"
      }
    ],
    "total": 25,
    "page": 0,
    "size": 10
  }
}
```

---

## Pending-request queue metrics

```http
GET /api/cash-collection/dashboard/pending-metrics?pending_date=2026-09-13
```

Powers the queue-count badge on the "Request-Based Collection" tab. Optional
`category_name`, `department_name`, `req_charge_type` filters narrow the same way as above.

| Field                     | Type    | Notes                                                                                         |
| ------------------------- | ------- | --------------------------------------------------------------------------------------------- |
| `pending_request_total`   | integer | Count of pending requests matching the filters.                                               |
| `req_charge_type_buckets` | array   | `[{ req_charge_type, pending_request_count }]`, sorted by `pending_request_count` descending. |

```json
{
  "success": true,
  "trace_id": "trace-124",
  "data": {
    "pending_request_total": 25,
    "req_charge_type_buckets": [
      { "req_charge_type": "OPD Service", "pending_request_count": 12 },
      { "req_charge_type": "IPD Advance Deposit", "pending_request_count": 8 },
      { "req_charge_type": "OPD Refund", "pending_request_count": 5 }
    ]
  }
}
```
