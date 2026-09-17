# Pending Requests table

```http
GET /api/cash-collection/requests?page=0&size=10
```

Powers the **Pending Requests** table on the Collection screen — the search
box, the Filter panel (Hospital Service / Request Type), sorting, and
pagination are all server-side. `department_name` is still returned per row
and accepted as a query filter (for the dashboard's cross-filtering and any
future UI), but the Filter panel itself no longer exposes a Department
dropdown.

## Query parameters

| Param                   | Type    | Notes                                                                                                                        |
| ----------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `page`                  | integer | Zero-based.                                                                                                                  |
| `size`                  | integer | Rows per page. The UI always requests `10`.                                                                                  |
| `req_search`            | string  | Matches patient name, CR number, or request number.                                                                          |
| `hospital_service_name` | string  | Exact match against one of `request_filter_options.hospital_service_names` from bootstrap. Omit for "All Hospital Services". |
| `req_type`              | string  | Exact match against one of `request_filter_options.req_types` from bootstrap. Omit for "All Request Types".                  |
| `department_name`       | string  | Exact match against one of `request_filter_options.department_names`. Omit for "All Departments".                            |
| `category_name`         | string  | Patient category, exact match. Not currently exposed as a UI filter but supported.                                           |
| `req_date`              | string  | `YYYY-MM-DD`. Not currently exposed as a UI filter but supported.                                                            |
| `req_sort`              | string  | `"req_date,desc"` or `"req_amount,asc"` — only `req_date` and `req_amount` are used today.                                   |

Return only the requested page **and** the total count for the authenticated
user's authorized counter scope — never the whole table.

## Response fields — return these exact names

| Column shown     | Field name              | Notes                                                                                                                                                                                                                                                               |
| ---------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Req No.          | `req_no`                | Unique request number, used to open the request.                                                                                                                                                                                                                    |
| Req Date         | `req_date`              | `DD/MM/YYYY`, e.g. `"09/09/2026"`.                                                                                                                                                                                                                                  |
| Patient Name     | `pat_name`              |                                                                                                                                                                                                                                                                     |
| CR No.           | `cr_num`                | String — never strip or reformat; the UI does display-only compaction.                                                                                                                                                                                              |
| Hospital Service | `hospital_service_name` | **Must be exactly** `"OPD"` \| `"IPD"` \| `"Emergency"` — the `HospitalService` enum. In HBIMS this is the charge-type family (`sblnum_chargetype_id` 1/4 → OPD, 2 → IPD, 3 → Emergency). Decides which service tile the request opens under.                       |
| Request Type     | `req_type`              | One of the 7 `RequestType` values (`Service`, `Refund`, `Advance Deposit`, `Advance Refund`, `Final Adjustment`, `Investigation Charges`, `Package Collection`). Decides the workflow. **Not** the `Receipt`/`Refund`/`Estimation` `request_type` used on commands. |
| Amount           | `req_amount`            | Decimal string, no currency symbol, e.g. `"480.00"`.                                                                                                                                                                                                                |
| _(not shown)_    | `req_version`           | Opaque concurrency token, re-sent when the request is opened/posted.                                                                                                                                                                                                |
| _(not shown)_    | `category_name`         | Patient category — used by the dashboard's cross-filtering, not shown as a queue column.                                                                                                                                                                            |
| _(not shown)_    | `department_name`       | No longer a queue column or a Filter panel option — still returned per row and accepted as a query filter.                                                                                                                                                          |

The two columns are independent dimensions. The combinations HBIMS can
actually raise through the queue today:

| `hospital_service_name` | `req_type`                                                             |
| ----------------------- | ---------------------------------------------------------------------- |
| `OPD`                   | `Service`, `Refund`, `Investigation Charges`, `Package Collection`     |
| `IPD`                   | `Advance Deposit`, `Advance Refund`, `Final Adjustment`                |
| `Emergency`             | _(none raised through the queue yet; accepted if the backend adds it)_ |

`Part Payment` never arrives as a queue request in HBIMS (`OFFRECPARTPAY` runs
only through Direct Collection) — do not return it here.

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
        "req_no": "REQ-100001",
        "req_date": "09/09/2026",
        "pat_name": "Example Patient",
        "department_name": "General Medicine",
        "cr_num": "939112600000001",
        "hospital_service_name": "OPD",
        "req_type": "Service",
        "req_amount": "480.00",
        "req_version": "1"
      },
      {
        "req_no": "ADJ-2026-0882",
        "req_date": "09/09/2026",
        "pat_name": "Rajesh Kumar Mehta",
        "department_name": "General Medicine",
        "cr_num": "939112600000002",
        "hospital_service_name": "IPD",
        "req_type": "Final Adjustment",
        "req_amount": "17390.00",
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
`category_name`, `department_name`, `hospital_service_name`, `req_type`
filters narrow the same way as above.

| Field                   | Type    | Notes                                                                                                                                                  |
| ----------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pending_request_total` | integer | Count of pending requests matching the filters.                                                                                                        |
| `req_type_buckets`      | array   | One bucket per (`hospital_service_name`, `req_type`) pair: `[{ hospital_service_name, req_type, pending_request_count }]`, sorted by count descending. |

```json
{
  "success": true,
  "trace_id": "trace-124",
  "data": {
    "pending_request_total": 25,
    "req_type_buckets": [
      {
        "hospital_service_name": "OPD",
        "req_type": "Service",
        "pending_request_count": 12
      },
      {
        "hospital_service_name": "IPD",
        "req_type": "Advance Deposit",
        "pending_request_count": 8
      },
      {
        "hospital_service_name": "OPD",
        "req_type": "Refund",
        "pending_request_count": 5
      }
    ]
  }
}
```
