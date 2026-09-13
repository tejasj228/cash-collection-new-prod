# Dashboard (server-side aggregation)

```http
GET /api/cash-collection/dashboard?date=2026-09-13&paymentMode=Cash&status=Completed&hour=10&category=General&group=Cardiology&requestType=OPD%20Service
```

> **Not currently called by the frontend.** `DashboardPage.jsx` aggregates
> everything itself from [`GET /transactions`](./10-transactions-list.md)'s
> rows. This endpoint is fully specified in `contracts/openapi.yaml` and is
> worth implementing anyway — for a hospital with thousands of transactions
> a day, shipping every row to the browser to sum up client-side won't
> scale, and this is the endpoint a future version of `DashboardPage.jsx`
> should switch to calling instead. Implement it to this exact shape so that
> switch is a small frontend change, not a redesign.

## Query parameters

| Param         | Type    | Required | Notes                                                                                                                    |
| ------------- | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| `date`        | string  | yes      | `YYYY-MM-DD`.                                                                                                            |
| `paymentMode` | string  | no       | Filters everything **except** `kpis.cashInDrawer`, which is always the full unfiltered cash net for the day (see below). |
| `status`      | string  | no       |                                                                                                                          |
| `hour`        | integer | no       | `0`–`23`.                                                                                                                |
| `category`    | string  | no       |                                                                                                                          |
| `group`       | string  | no       | Department.                                                                                                              |
| `requestType` | string  | no       |                                                                                                                          |

Calculate every KPI and every breakdown from **the same frozen query scope**
so the numbers reconcile with each other. Do not send thousands of
transaction rows just to let the browser compute a chart — return aggregated
buckets and a small paged `recentTransactions` sample.

## Response fields

| Field                     | Type                                           | Notes                                                                                                                                                                                                                     |
| ------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `businessDate`            | string                                         | `YYYY-MM-DD`.                                                                                                                                                                                                             |
| `version`                 | string                                         | Opaque — bump it when the shift closes, so a client can detect a stale cached dashboard.                                                                                                                                  |
| `generatedAt`             | string                                         | ISO 8601 timestamp.                                                                                                                                                                                                       |
| `kpis.totalCollected`     | string decimal                                 |                                                                                                                                                                                                                           |
| `kpis.refunds`            | string decimal                                 |                                                                                                                                                                                                                           |
| `kpis.netCollection`      | string decimal                                 | `totalCollected - refunds`.                                                                                                                                                                                               |
| `kpis.bills`              | string of int                                  | Completed-collection count.                                                                                                                                                                                               |
| `kpis.cashInDrawer`       | string decimal                                 | **Same-day cash-mode collections minus cash-mode refunds, unfiltered by any of the above filters.** This is the figure shift-close reconciliation checks against — it must never move when someone clicks a chart filter. |
| `kpis.largestCollection`  | string decimal                                 |                                                                                                                                                                                                                           |
| `breakdowns.paymentModes` | array of [`DashboardBucket`](#dashboardbucket) |                                                                                                                                                                                                                           |
| `breakdowns.categories`   | array of `DashboardBucket`                     |                                                                                                                                                                                                                           |
| `breakdowns.groups`       | array of `DashboardBucket`                     | Department breakdown.                                                                                                                                                                                                     |
| `breakdowns.requestTypes` | array of `DashboardBucket`                     |                                                                                                                                                                                                                           |
| `hourlyCollections`       | array of `DashboardBucket` + `hour`            | One entry per hour, `0`–`23`, even if `count` is `0` for that hour.                                                                                                                                                       |
| `recentTransactions`      | `{ items, total, page, size }`                 | A small page (5 rows in the mock) — the full list is [`GET /transactions`](./10-transactions-list.md).                                                                                                                    |

### `DashboardBucket`

| Field        | Type           | Notes                                                  |
| ------------ | -------------- | ------------------------------------------------------ |
| `id`         | string         | Stable key, e.g. `"Cash"`, `"General"`, `"10"` (hour). |
| `label`      | string         | Display label — often the same as `id`.                |
| `amount`     | string decimal |                                                        |
| `count`      | string of int  |                                                        |
| `percentage` | string decimal | Share of `kpis.totalCollected`, `"0.00"`–`"100.00"`.   |

## Example response

```json
{
  "success": true,
  "requestId": "trace-1001",
  "data": {
    "businessDate": "2026-09-13",
    "version": "shift-v7",
    "generatedAt": "2026-09-13T10:45:00+05:30",
    "kpis": {
      "totalCollected": "405226.00",
      "refunds": "90828.00",
      "netCollection": "314398.00",
      "bills": "60",
      "cashInDrawer": "96672.00",
      "largestCollection": "17390.00"
    },
    "breakdowns": {
      "paymentModes": [
        {
          "id": "Cash",
          "label": "Cash",
          "amount": "96672.00",
          "count": "18",
          "percentage": "31.00"
        },
        {
          "id": "Cheque",
          "label": "Cheque",
          "amount": "77926.00",
          "count": "9",
          "percentage": "25.00"
        }
      ],
      "categories": [
        {
          "id": "Private",
          "label": "Private",
          "amount": "51520.00",
          "count": "10",
          "percentage": "16.00"
        }
      ],
      "groups": [
        {
          "id": "Cardiology",
          "label": "Cardiology",
          "amount": "27430.00",
          "count": "6",
          "percentage": "8.00"
        }
      ],
      "requestTypes": [
        {
          "id": "OPD Service",
          "label": "OPD Service",
          "amount": "54432.00",
          "count": "22",
          "percentage": "13.00"
        }
      ]
    },
    "hourlyCollections": [
      {
        "id": "9",
        "label": "9",
        "hour": 9,
        "amount": "12480.00",
        "count": "4",
        "percentage": "3.00"
      },
      {
        "id": "10",
        "label": "10",
        "hour": 10,
        "amount": "8600.00",
        "count": "3",
        "percentage": "2.00"
      }
    ],
    "recentTransactions": {
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
        }
      ],
      "total": 60,
      "page": 0,
      "size": 5
    }
  }
}
```
