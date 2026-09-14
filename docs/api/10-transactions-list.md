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

| Param                   | Type    | Notes                                        |
| ----------------------- | ------- | -------------------------------------------- |
| `page`                  | integer | Zero-based.                                  |
| `size`                  | integer |                                              |
| `transaction_from_date` | string  | `YYYY-MM-DD`, optional inclusive start date. |
| `transaction_to_date`   | string  | `YYYY-MM-DD`, optional inclusive end date.   |
| `payment_mode`          | string  | Optional payment-mode filter.                |
| `transaction_status`    | string  | Optional transaction-status filter.          |

## Response fields — return these exact names, every value a string

| Column shown                            | Field name              | Notes                                                                                                                                                                                                    |
| --------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bill No.                                | `transaction_no`        | e.g. `"REC-2026-088241"`, `"REF-…"`.                                                                                                                                                                     |
| Patient Name                            | `pat_name`              |                                                                                                                                                                                                          |
| CR No.                                  | `cr_num`                |                                                                                                                                                                                                          |
| _(used for grouping/sort)_              | `transaction_date_iso`  | `YYYY-MM-DD`.                                                                                                                                                                                            |
| _(shown under Bill No.)_                | `transaction_time`      | `"10:38 AM"`. Parsed client-side into an hour-of-day (0–23) for the hourly chart.                                                                                                                        |
| Payment Mode                            | `payment_mode`          | `"Cash"` \| `"Card"` \| `"UPI"` \| `"Cheque"`. Powers the Payment-Mode donut.                                                                                                                            |
| Amount                                  | `transaction_amount`    | Decimal string, no currency symbol.                                                                                                                                                                      |
| Bill Type (status pill)                 | `transaction_status`    | `"Completed"` \| `"Refunded"` \| `"Cancelled"`. (`"Failed"` / `"Unposted"` are reserved but not currently rendered.)                                                                                     |
| _(dashboard grouping only)_             | `department_name`       | Patient's raising department — feeds the "Group" view of the second donut. A view exposing `department_name` is also accepted.                                                                           |
| _(dashboard grouping only)_             | `category_name`         | Patient category — feeds the "Patient Category" view of the second donut. `pat_category` is also accepted.                                                                                               |
| _(dashboard grouping only)_             | `req_charge_type`       | The charge type / billing-service label for this row (e.g. `"OPD Service"`, `"Bill Settlement"`).                                                                                                        |
| **feeds the OPD/IPD/Emergency treemap** | `hospital_service_name` | **Must be exactly** `"OPD"` \| `"IPD"` \| `"Emergency"`. See the mapping table in [`post-transaction.md`](./09-post-transaction.md#dashboard_transaction_row--the-row-that-feeds-every-dashboard-chart). |
| **feeds the treemap's IPD drill-down**  | `billing_service_name`  | **Must be exactly** `"Service"` \| `"Advance"` \| `"Part Payment"` \| `"Bill Settlement"` (a billed `"Package"` folds into `"Service"` here — see `BILLING_SERVICE_BUCKET`).                             |

Do not return JSON numbers for `transaction_amount`, `cr_num`, or `transaction_no`. `transaction_status` is one of
`Completed` / `Refunded` / `Cancelled`. The same row contract applies to the
`recent_transaction_rows` array in [bootstrap](./01-bootstrap.md) and to this
endpoint's paged `items`. Pagination metadata (`total`, `page`, `size`)
remains numeric.

## Example response

```json
{
  "success": true,
  "trace_id": "trace-901",
  "data": {
    "items": [
      {
        "transaction_no": "REC-2026-088241",
        "pat_name": "Rajesh Kumar Mehta",
        "cr_num": "939112600000001",
        "transaction_date_iso": "2026-09-13",
        "transaction_time": "10:38 AM",
        "payment_mode": "Cash",
        "transaction_amount": "4280.00",
        "transaction_status": "Completed",
        "department_name": "General Medicine",
        "category_name": "General",
        "req_charge_type": "OPD Service",
        "hospital_service_name": "OPD",
        "billing_service_name": "Service"
      },
      {
        "transaction_no": "REF-2024-000912",
        "pat_name": "Meena Kumari",
        "cr_num": "939112600000005",
        "transaction_date_iso": "2026-09-13",
        "transaction_time": "10:12 AM",
        "payment_mode": "Cash",
        "transaction_amount": "2450.00",
        "transaction_status": "Refunded",
        "department_name": "Gynaecology",
        "category_name": "General",
        "req_charge_type": "IPD Advance Refund",
        "hospital_service_name": "IPD",
        "billing_service_name": "Advance"
      }
    ],
    "total": 71,
    "page": 0,
    "size": 5
  }
}
```
