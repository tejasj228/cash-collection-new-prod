# Dashboard (server-side aggregation)

```http
GET /api/cash-collection/dashboard?dashboard_date=2026-09-13&payment_mode=Cash&transaction_status=Completed&collection_hour=10&category_name=General&department_name=Cardiology&req_charge_type=OPD%20Service
```

> **Not currently called by the frontend.** `Dashboard/Dashboard.jsx` aggregates
> everything itself from [`GET /transactions`](./10-transactions-list.md)'s
> rows. This endpoint is fully specified in `contracts/openapi.yaml` and is
> worth implementing anyway — for a hospital with thousands of transactions
> a day, shipping every row to the browser to sum up client-side won't
> scale, and this is the endpoint a future version of `Dashboard/Dashboard.jsx`
> should switch to calling instead. Implement it to this exact shape so that
> switch is a small frontend change, not a redesign.

## Query parameters

| Param                | Type    | Required | Notes                                                                                                                                       |
| -------------------- | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `dashboard_date`     | string  | yes      | `YYYY-MM-DD`.                                                                                                                               |
| `payment_mode`       | string  | no       | Filters everything **except** `dashboard_kpis.cash_in_drawer_amount`, which is always the full unfiltered cash net for the day (see below). |
| `transaction_status` | string  | no       |                                                                                                                                             |
| `collection_hour`    | integer | no       | `0`–`23`.                                                                                                                                   |
| `category_name`      | string  | no       |                                                                                                                                             |
| `department_name`    | string  | no       | Department.                                                                                                                                 |
| `req_charge_type`    | string  | no       |                                                                                                                                             |

Calculate every KPI and every breakdown from **the same frozen query scope**
so the numbers reconcile with each other. Do not send thousands of
transaction rows just to let the browser compute a chart — return aggregated
buckets and a small paged `dashboard_recent_transaction_page` sample.

## Response fields

| Field                                          | Type                                           | Notes                                                                                                                                                                                                                     |
| ---------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dashboard_business_date`                      | string                                         | `YYYY-MM-DD`.                                                                                                                                                                                                             |
| `dashboard_version`                            | string                                         | Opaque — bump it when the shift closes, so a client can detect a stale cached dashboard.                                                                                                                                  |
| `dashboard_generated_at`                       | string                                         | ISO 8601 timestamp.                                                                                                                                                                                                       |
| `dashboard_kpis.collection_total_amount`       | string decimal                                 |                                                                                                                                                                                                                           |
| `dashboard_kpis.refund_total_amount`           | string decimal                                 |                                                                                                                                                                                                                           |
| `dashboard_kpis.net_collection_amount`         | string decimal                                 | `collection_total_amount - refund_total_amount`.                                                                                                                                                                          |
| `dashboard_kpis.transaction_count`             | string of int                                  | Completed-collection count.                                                                                                                                                                                               |
| `dashboard_kpis.cash_in_drawer_amount`         | string decimal                                 | **Same-day cash-mode collections minus cash-mode refunds, unfiltered by any of the above filters.** This is the figure shift-close reconciliation checks against — it must never move when someone clicks a chart filter. |
| `dashboard_kpis.largest_collection_amount`     | string decimal                                 |                                                                                                                                                                                                                           |
| `dashboard_breakdowns.payment_mode_buckets`    | array of [`DashboardBucket`](#dashboardbucket) |                                                                                                                                                                                                                           |
| `dashboard_breakdowns.category_buckets`        | array of `DashboardBucket`                     |                                                                                                                                                                                                                           |
| `dashboard_breakdowns.department_buckets`      | array of `DashboardBucket`                     | Department breakdown.                                                                                                                                                                                                     |
| `dashboard_breakdowns.req_charge_type_buckets` | array of `DashboardBucket`                     |                                                                                                                                                                                                                           |
| `hourly_collection_buckets`                    | array of `DashboardBucket` + `collection_hour` | One entry per hour, `0`–`23`, even if `dashboard_bucket_count` is `0` for that hour.                                                                                                                                      |
| `dashboard_recent_transaction_page`            | `{ items, total, page, size }`                 | A small page (5 rows in the mock) — the full list is [`GET /transactions`](./10-transactions-list.md).                                                                                                                    |

### `DashboardBucket`

| Field                         | Type           | Notes                                                                   |
| ----------------------------- | -------------- | ----------------------------------------------------------------------- |
| `dashboard_bucket_id`         | string         | Stable key, e.g. `"Cash"`, `"General"`, `"10"` (hour).                  |
| `dashboard_bucket_label`      | string         | Display label — often the same as `dashboard_bucket_id`.                |
| `dashboard_bucket_amount`     | string decimal |                                                                         |
| `dashboard_bucket_count`      | string of int  |                                                                         |
| `dashboard_bucket_percentage` | string decimal | Share of `dashboard_kpis.collection_total_amount`, `"0.00"`–`"100.00"`. |

## Example response

```json
{
  "success": true,
  "trace_id": "trace-1001",
  "data": {
    "dashboard_business_date": "2026-09-13",
    "dashboard_version": "shift-v7",
    "dashboard_generated_at": "2026-09-13T10:45:00+05:30",
    "dashboard_kpis": {
      "collection_total_amount": "405226.00",
      "refund_total_amount": "90828.00",
      "net_collection_amount": "314398.00",
      "transaction_count": "60",
      "cash_in_drawer_amount": "96672.00",
      "largest_collection_amount": "17390.00"
    },
    "dashboard_breakdowns": {
      "payment_mode_buckets": [
        {
          "dashboard_bucket_id": "Cash",
          "dashboard_bucket_label": "Cash",
          "dashboard_bucket_amount": "96672.00",
          "dashboard_bucket_count": "18",
          "dashboard_bucket_percentage": "31.00"
        },
        {
          "dashboard_bucket_id": "Cheque",
          "dashboard_bucket_label": "Cheque",
          "dashboard_bucket_amount": "77926.00",
          "dashboard_bucket_count": "9",
          "dashboard_bucket_percentage": "25.00"
        }
      ],
      "category_buckets": [
        {
          "dashboard_bucket_id": "Private",
          "dashboard_bucket_label": "Private",
          "dashboard_bucket_amount": "51520.00",
          "dashboard_bucket_count": "10",
          "dashboard_bucket_percentage": "16.00"
        }
      ],
      "department_buckets": [
        {
          "dashboard_bucket_id": "Cardiology",
          "dashboard_bucket_label": "Cardiology",
          "dashboard_bucket_amount": "27430.00",
          "dashboard_bucket_count": "6",
          "dashboard_bucket_percentage": "8.00"
        }
      ],
      "req_charge_type_buckets": [
        {
          "dashboard_bucket_id": "OPD Service",
          "dashboard_bucket_label": "OPD Service",
          "dashboard_bucket_amount": "54432.00",
          "dashboard_bucket_count": "22",
          "dashboard_bucket_percentage": "13.00"
        }
      ]
    },
    "hourly_collection_buckets": [
      {
        "dashboard_bucket_id": "9",
        "dashboard_bucket_label": "9",
        "collection_hour": 9,
        "dashboard_bucket_amount": "12480.00",
        "dashboard_bucket_count": "4",
        "dashboard_bucket_percentage": "3.00"
      },
      {
        "dashboard_bucket_id": "10",
        "dashboard_bucket_label": "10",
        "collection_hour": 10,
        "dashboard_bucket_amount": "8600.00",
        "dashboard_bucket_count": "3",
        "dashboard_bucket_percentage": "2.00"
      }
    ],
    "dashboard_recent_transaction_page": {
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
        }
      ],
      "total": 60,
      "page": 0,
      "size": 5
    }
  }
}
```
