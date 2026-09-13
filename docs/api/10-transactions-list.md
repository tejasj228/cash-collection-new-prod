# Recent Transactions

```http
GET /api/cash-collection/transactions?page=0&size=5
```

This one row shape feeds **everything** on the Dashboard: the Recent
Transactions table, the KPI tiles, the Payment-Mode donut, the
Category/Department donut, the OPD/IPD/Emergency billing-service treemap
(and its IPD drill-down), and the hourly collection chart. **The current
frontend does not call `GET /dashboard` at all** — `DashboardPage.jsx` loads
this row list once (via [bootstrap](./01-bootstrap.md)) and computes every
KPI/chart client-side in JavaScript. Getting this row shape exactly right is
therefore the single most important thing for making the real dashboard work
— see `PROJECT_GUIDE.md` §10.

## Query parameters

| Param  | Type    | Notes                                                                                                                                                  |
| ------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `page` | integer | Zero-based.                                                                                                                                            |
| `size` | integer |                                                                                                                                                        |
| `date` | string  | `YYYY-MM-DD`, defaults to today.                                                                                                                       |
| Others | —       | Not currently sent by the UI, but `paymentMode`/`status`/`category`/`department` filters are reasonable to support for a future server-side dashboard. |

## Response fields — return these exact names, every value a string

| Column shown                            | Field name        | Notes                                                                                                                                                                                                                                                                                                |
| --------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bill No.                                | `no`              | e.g. `"REC-2026-088241"`, `"REF-…"`.                                                                                                                                                                                                                                                                 |
| Patient Name                            | `patient`         |                                                                                                                                                                                                                                                                                                      |
| CR No.                                  | `cr`              |                                                                                                                                                                                                                                                                                                      |
| _(used for grouping/sort)_              | `dateIso`         | `YYYY-MM-DD`.                                                                                                                                                                                                                                                                                        |
| _(shown under Bill No.)_                | `time`            | `"10:38 AM"`. Parsed client-side into an hour-of-day (0–23) for the hourly chart.                                                                                                                                                                                                                    |
| Payment Mode                            | `mode`            | `"Cash"` \| `"Card"` \| `"UPI"` \| `"Cheque"`. Powers the Payment-Mode donut.                                                                                                                                                                                                                        |
| Amount                                  | `amount`          | Decimal string, no currency symbol.                                                                                                                                                                                                                                                                  |
| Bill Type (status pill)                 | `status`          | `"Completed"` \| `"Refunded"` \| `"Cancelled"`. (`"Failed"` / `"Unposted"` are reserved but not currently rendered.)                                                                                                                                                                                 |
| _(dashboard grouping only)_             | `department`      | Patient's raising department — feeds the "Group" view of the second donut. A view exposing `department_name` is also accepted.                                                                                                                                                                       |
| _(dashboard grouping only)_             | `category`        | Patient category — feeds the "Patient Category" view of the second donut. `pat_category` is also accepted.                                                                                                                                                                                           |
| _(dashboard grouping only)_             | `requestType`     | The charge type / billing-service label for this row (e.g. `"OPD Service"`, `"Bill Settlement"`). `request_type` / `chargeType` / `charge_type` are also accepted.                                                                                                                                   |
| **feeds the OPD/IPD/Emergency treemap** | `hospitalService` | **Must be exactly** `"OPD"` \| `"IPD"` \| `"Emergency"`. See the mapping table in [`post-transaction.md`](./09-post-transaction.md#dashboardtransaction--the-row-that-feeds-every-dashboard-chart). **This field is not yet in `contracts/openapi.yaml`'s `Transaction` schema — add it there too.** |
| **feeds the treemap's IPD drill-down**  | `billingService`  | **Must be exactly** `"Service"` \| `"Advance"` \| `"Part Payment"` \| `"Bill Settlement"` (a billed `"Package"` folds into `"Service"` here — see `BILLING_SERVICE_BUCKET`). Same note: add to `openapi.yaml`.                                                                                       |

Do not return JSON numbers for `amount`, `cr`, or `no`. `status` is one of
`Completed` / `Refunded` / `Cancelled`. The same row contract applies to the
`recentTransactions` array in [bootstrap](./01-bootstrap.md) and to this
endpoint's paged `items`. Pagination metadata (`total`, `page`, `size`)
remains numeric.

## Example response

```json
{
  "success": true,
  "requestId": "trace-901",
  "data": {
    "items": [
      {
        "no": "REC-2026-088241",
        "patient": "Rajesh Kumar Mehta",
        "cr": "939112600000001",
        "dateIso": "2026-09-13",
        "time": "10:38 AM",
        "mode": "Cash",
        "amount": "4280.00",
        "status": "Completed",
        "department": "General Medicine",
        "category": "General",
        "requestType": "OPD Service",
        "hospitalService": "OPD",
        "billingService": "Service"
      },
      {
        "no": "REF-2024-000912",
        "patient": "Meena Kumari",
        "cr": "939112600000005",
        "dateIso": "2026-09-13",
        "time": "10:12 AM",
        "mode": "Cash",
        "amount": "2450.00",
        "status": "Refunded",
        "department": "Gynaecology",
        "category": "General",
        "requestType": "IPD Advance Refund",
        "hospitalService": "IPD",
        "billingService": "Advance"
      }
    ],
    "total": 71,
    "page": 0,
    "size": 5
  }
}
```
