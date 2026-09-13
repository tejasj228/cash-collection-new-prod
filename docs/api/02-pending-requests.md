# Pending Requests table

```http
GET /api/cash-collection/requests?page=0&size=10
```

Powers the **Pending Requests** table on the Collection screen — the search
box, the Filter panel (Charge Type / Department), sorting, and pagination
are all server-side.

## Query parameters

| Param        | Type    | Notes                                                                                                      |
| ------------ | ------- | ---------------------------------------------------------------------------------------------------------- |
| `page`       | integer | Zero-based.                                                                                                |
| `size`       | integer | Rows per page. The UI always requests `10`.                                                                |
| `search`     | string  | Matches patient name, CR number, or request number.                                                        |
| `chargeType` | string  | Exact match against one of `requestFilterOptions.chargeTypes` from bootstrap. Omit for "All Charge Types". |
| `department` | string  | Exact match against one of `requestFilterOptions.departments`. Omit for "All Departments".                 |
| `category`   | string  | Patient category, exact match. Not currently exposed as a UI filter but supported.                         |
| `date`       | string  | `YYYY-MM-DD`. Not currently exposed as a UI filter but supported.                                          |
| `sort`       | string  | `"date,desc"` or `"amount,asc"` style — only `date` and `amount` are used today.                           |

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
| Charge Type   | `charge_type`     | One of the 7 `RequestChargeType` values (`OPD Service`, `OPD Refund`, `IPD Advance Deposit`, `IPD Advance Refund`, `IPD Final Adjustment`, `Investigation Charges`, `Package Collection`). |
| Amount        | `amount`          | Decimal string, no currency symbol, e.g. `"480.00"`.                                                                                                                                       |
| _(not shown)_ | `version`         | Opaque concurrency token, re-sent when the request is opened/posted.                                                                                                                       |
| _(not shown)_ | `category_name`   | Patient category — used by the dashboard's cross-filtering, not shown as a queue column.                                                                                                   |

Every property in a row is a **JSON string** — do not return JSON numbers for
`amount`, `cr_num`, or `version`. `req_date` uses `DD/MM/YYYY`; a separate
ISO date is not required for this endpoint (the frontend derives it). The
outer `requestId` is an API trace ID, not the row's request number — don't
confuse the two.

Any `requests` rows included in [bootstrap](./01-bootstrap.md) use this same
field-name set.

## Example response

```json
{
  "success": true,
  "requestId": "trace-123",
  "data": {
    "items": [
      {
        "req_id": "REQ-100001",
        "req_date": "09/09/2026",
        "pat_name": "Example Patient",
        "department_name": "General Medicine",
        "cr_num": "939112600000001",
        "charge_type": "OPD Service",
        "amount": "480.00",
        "version": "1"
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
GET /api/cash-collection/dashboard/pending-metrics?date=2026-09-13
```

Powers the queue-count badge on the "Request-Based Collection" tab. Optional
`category`, `department`, `chargeType` filters narrow the same way as above.

| Field          | Type    | Notes                                                    |
| -------------- | ------- | -------------------------------------------------------- |
| `total`        | integer | Count of pending requests matching the filters.          |
| `byChargeType` | array   | `[{ chargeType, count }]`, sorted by `count` descending. |

```json
{
  "success": true,
  "requestId": "trace-124",
  "data": {
    "total": 25,
    "byChargeType": [
      { "chargeType": "OPD Service", "count": 12 },
      { "chargeType": "IPD Advance Deposit", "count": 8 },
      { "chargeType": "OPD Refund", "count": 5 }
    ]
  }
}
```
