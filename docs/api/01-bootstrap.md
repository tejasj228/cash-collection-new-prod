# Bootstrap

```http
GET /api/cash-collection/bootstrap
```

Called once, when the app loads. Returns everything the app needs to render
the shell cold: the current business date, the hospital services and their
billing-option matrix, an initial page of the pending-requests queue, an
initial page of recent transactions, the tariff catalogue, and payment
options. No query parameters.

For a very large hospital, `requests` and `recentTransactions` may contain
only the first page — the UI re-fetches full pages through
[`GET /requests`](./02-pending-requests.md) and
[`GET /transactions`](./10-transactions-list.md) as needed. Every other array
(`serviceOptions`, `billingByService`, `tariffGroups`, `tariffCatalog`,
`paymentOptions`) must be complete — nothing paginates those.

## Response fields

| Field                              | Type             | Notes                                                                                                                                                                  |
| ---------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `todayIso`                         | string           | `YYYY-MM-DD`. The **hospital's business date**, from the server — never the browser clock.                                                                             |
| `facility.name`                    | string           | Shown in the printed receipt header.                                                                                                                                   |
| `facility.subtitle`                | string           | Optional, shown under the name on the receipt.                                                                                                                         |
| `serviceOptions`                   | array            | The 4 hospital-service tiles (OPD Normal, OPD Special, IPD, Emergency) — see shape below.                                                                              |
| `billingByService`                 | object           | Keyed by `serviceOptions[].id`, then by `"Receipt" \| "Refund" \| "Estimation"` — see shape below. **Every** service must have all three keys, each a non-empty array. |
| `patients`                         | array            | Optional at bootstrap time — [`GET /patients`](./04-patient-search.md) is the real source. Bootstrap may ship a small seed list.                                       |
| `requests`                         | array            | Pending-requests rows, same shape as [`GET /requests`](./02-pending-requests.md)'s `items`.                                                                            |
| `tariffGroups`                     | array of strings | e.g. `["All groups", "Consultation", "Accommodation", "Investigation", "Radiology", "Procedure", "Pharmacy"]`.                                                         |
| `tariffCatalog`                    | array            | Every tariff — see [`GET /tariffs`](./05-tariffs.md).                                                                                                                  |
| `recentTransactions`               | array            | Same row shape as [`GET /transactions`](./10-transactions-list.md).                                                                                                    |
| `recentEstimates`                  | array            | Not currently rendered by any screen — safe to return `[]`.                                                                                                            |
| `paymentOptions`                   | object           | Same shape as [`GET /payment-options`](./06-payment-options.md).                                                                                                       |
| `queueSummary.pendingCount`        | string of int    | Total open requests, all dates, this counter's scope.                                                                                                                  |
| `queueSummary.todayPendingCount`   | string of int    | Open requests for `todayIso` only.                                                                                                                                     |
| `queueSummary.cashInDrawer`        | string decimal   | Today's cash-mode collections minus cash-mode refunds.                                                                                                                 |
| `requestFilterOptions.chargeTypes` | array of strings | Populates the queue's "Charge Type" filter dropdown.                                                                                                                   |
| `requestFilterOptions.departments` | array of strings | Populates the queue's "Department" filter dropdown.                                                                                                                    |

### `serviceOptions[]`

| Field                | Example                                                  | Notes                                                                                                   |
| -------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `id`                 | `"opd-normal"`                                           | Stable slug: `opd-normal` \| `opd-special` \| `ipd` \| `emergency`. Used as the `billingByService` key. |
| `legacyChargeTypeId` | `"1"`                                                    | The legacy charge-type ID (`1`=OPD Normal, `2`=IPD, `3`=Emergency, `4`=OPD Special).                    |
| `label`              | `"OPD Normal"`                                           | Shown on the service tile.                                                                              |
| `short`              | `"OPD"`                                                  | Unused visually today; keep for future badges.                                                          |
| `title`              | `"Routine outpatient service"`                           | Tile subtitle.                                                                                          |
| `description`        | `"Collect for an existing outpatient visit or service."` | Tile body text.                                                                                         |
| `tone`               | `"blue"`                                                 | One of `blue` \| `violet` \| `teal` \| `coral` — controls tile accent color.                            |
| `icon`               | `"stethoscope"`                                          | Must be one of the names in `src/shared/components/Icon.jsx`.                                           |

### `billingByService[serviceId][requestType][]`

Each entry is an **executable workflow descriptor**, not display text:

| Field                 | Example                   | Notes                                                                                                                                                           |
| --------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                  | `"35"`                    | The visible billing-service master ID.                                                                                                                          |
| `label`               | `"Bill Settlement"`       | Shown in the Billing Service dropdown.                                                                                                                          |
| `processingServiceId` | `"21"`                    | The service ID the legacy write path actually uses — see `PROJECT_GUIDE.md` §9.2. Usually equal to `id`; **differs** for IPD Bill Settlement (`35` → `21`).     |
| `uiFamily`            | `"bill-settlement"`       | One of the 9 `WorkflowFamily` values — picks which React form renders.                                                                                          |
| `legacyMode`          | `"ONLINEFINALSETTLEMENT"` | The `hmode` this dispatches to. `"SERVER_RESOLVED"` means "not yet a verified write route" — `checkEligibility` must reject it with `WORKFLOW_NOT_IMPLEMENTED`. |

## Example response

```json
{
  "success": true,
  "requestId": "trace-abc123",
  "data": {
    "todayIso": "2026-09-13",
    "facility": {
      "name": "HBIMS Hospital",
      "subtitle": "Hospital Billing & Information Management"
    },
    "serviceOptions": [
      {
        "id": "opd-normal",
        "legacyChargeTypeId": "1",
        "label": "OPD Normal",
        "short": "OPD",
        "title": "Routine outpatient service",
        "description": "Collect for an existing outpatient visit or service.",
        "tone": "blue",
        "icon": "stethoscope"
      },
      {
        "id": "ipd",
        "legacyChargeTypeId": "2",
        "label": "IPD",
        "short": "IPD",
        "title": "Inpatient account",
        "description": "Post advance, service or part payment against admission.",
        "tone": "teal",
        "icon": "bed"
      }
    ],
    "billingByService": {
      "opd-normal": {
        "Receipt": [
          {
            "id": "10",
            "label": "Service",
            "processingServiceId": "10",
            "uiFamily": "tariff-entry",
            "legacyMode": "OFFRECSER"
          }
        ],
        "Refund": [
          {
            "id": "10",
            "label": "Service",
            "processingServiceId": "10",
            "uiFamily": "service-refund",
            "legacyMode": "OFFREFUNDSER"
          }
        ],
        "Estimation": [
          {
            "id": "10",
            "label": "Service",
            "processingServiceId": "10",
            "uiFamily": "tariff-entry",
            "legacyMode": "OFFESTIMATION"
          }
        ]
      },
      "ipd": {
        "Receipt": [
          {
            "id": "11",
            "label": "Service",
            "processingServiceId": "11",
            "uiFamily": "tariff-entry",
            "legacyMode": "OFFRECSER"
          },
          {
            "id": "19",
            "label": "Advance",
            "processingServiceId": "19",
            "uiFamily": "account-payment",
            "legacyMode": "OFFRECADV"
          },
          {
            "id": "35",
            "label": "Bill Settlement",
            "processingServiceId": "21",
            "uiFamily": "bill-settlement",
            "legacyMode": "ONLINEFINALSETTLEMENT"
          }
        ],
        "Refund": [
          {
            "id": "35",
            "label": "Bill Settlement",
            "processingServiceId": "21",
            "uiFamily": "bill-settlement-refund",
            "legacyMode": "SERVER_RESOLVED"
          }
        ],
        "Estimation": [
          {
            "id": "11",
            "label": "Service",
            "processingServiceId": "11",
            "uiFamily": "tariff-entry",
            "legacyMode": "OFFESTIMATION"
          }
        ]
      }
    },
    "patients": [],
    "requests": [
      {
        "req_id": "BIL-2024-1200",
        "req_date": "13/09/2026",
        "pat_name": "Ajay Deshmukh",
        "department_name": "Cardiology",
        "cr_num": "939112600000004",
        "charge_type": "OPD Service",
        "amount": "480.00",
        "version": "1"
      }
    ],
    "tariffGroups": [
      "All groups",
      "Consultation",
      "Accommodation",
      "Investigation",
      "Radiology",
      "Procedure",
      "Pharmacy"
    ],
    "tariffCatalog": [
      {
        "code": "CONS-101",
        "name": "Consultation — Cardiology",
        "group": "Consultation",
        "rate": 600
      }
    ],
    "collectionModes": [],
    "recentTransactions": [
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
    "recentEstimates": [],
    "paymentOptions": {
      "modes": ["Cash", "Card", "UPI", "Cheque"],
      "cardTypes": ["Debit Card", "Credit Card"],
      "posTerminals": ["T1", "T2", "T3"],
      "restrictionsByCategory": {
        "CGHS": { "Cheque": "not permitted for the CGHS category" }
      }
    },
    "queueSummary": {
      "pendingCount": "25",
      "todayPendingCount": "25",
      "cashInDrawer": "96672.00"
    },
    "requestFilterOptions": {
      "chargeTypes": [
        "IPD Advance Deposit",
        "IPD Advance Refund",
        "IPD Final Adjustment",
        "OPD Refund",
        "OPD Service"
      ],
      "departments": [
        "Cardiology",
        "General Medicine",
        "Gynaecology",
        "Orthopaedics"
      ]
    }
  }
}
```
