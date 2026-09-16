# Bootstrap

```http
GET /api/cash-collection/bootstrap
```

Called once, when the app loads. Returns everything the app needs to render
the shell cold: the current business date, the hospital services and their
billing-option matrix, an initial page of the pending request queue, an
initial page of recent transactions, the tariff catalogue, and payment
options. No query parameters.

For a very large hospital, `pending_request_queue` and `recent_transaction_rows` may contain
only the first page — the UI re-fetches full pages through
[`GET /requests`](./02-pending-requests.md) and
[`GET /transactions`](./10-transactions-list.md) as needed. Every other array
(`hospital_services`, `billing_services_by_hospital_service`, `tariff_group_names`, `tariff_catalog`,
`payment_options`) must be complete — nothing paginates those.

## Response fields

| Field                                               | Type             | Notes                                                                                                                                                                                      |
| --------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `business_date`                                     | string           | `YYYY-MM-DD`. The **hospital's business date**, from the server — never the browser clock.                                                                                                 |
| `facility_details.facility_name`                    | string           | Shown in the printed receipt header.                                                                                                                                                       |
| `facility_details.facility_subtitle`                | string           | Optional, shown under the name on the receipt.                                                                                                                                             |
| `hospital_services`                                 | array            | The 4 hospital-service tiles (OPD Normal, OPD Special, IPD, Emergency) — see shape below.                                                                                                  |
| `billing_services_by_hospital_service`              | object           | Keyed by `hospital_services[].hospital_service_id`, then by `"Receipt" \| "Refund" \| "Estimation"` — see shape below. **Every** service must have all three keys, each a non-empty array. |
| `patient_seed_list`                                 | array            | Optional at bootstrap time — [`GET /patients`](./04-patient-search.md) is the real source. Bootstrap may ship a small seed list.                                                           |
| `pending_request_queue`                             | array            | Pending request rows, same shape as [`GET /requests`](./02-pending-requests.md)'s `items`.                                                                                                 |
| `tariff_group_names`                                | array of strings | e.g. `["All groups", "Consultation", "Accommodation", "Investigation", "Radiology", "Procedure", "Pharmacy"]`.                                                                             |
| `tariff_catalog`                                    | array            | Every tariff — see [`GET /tariffs`](./05-tariffs.md).                                                                                                                                      |
| `recent_transaction_rows`                           | array            | Same row shape as [`GET /transactions`](./10-transactions-list.md).                                                                                                                        |
| `recent_estimate_rows`                              | array            | Not currently rendered by any screen — safe to return `[]`.                                                                                                                                |
| `payment_options`                                   | object           | Same shape as [`GET /payment-options`](./06-payment-options.md).                                                                                                                           |
| `pending_queue_summary.pending_request_count`       | string of int    | Total open pending requests, all dates, this counter's scope.                                                                                                                              |
| `pending_queue_summary.today_pending_request_count` | string of int    | Open pending requests for `business_date` only.                                                                                                                                            |
| `pending_queue_summary.cash_in_drawer_amount`       | string decimal   | Today's cash-mode collections minus cash-mode refunds.                                                                                                                                     |
| `request_filter_options.hospital_service_names`     | array of strings | Populates the queue's "Hospital Service" filter dropdown — the distinct `hospital_service_name` values present in the queue (`OPD` / `IPD` / `Emergency`).                                 |
| `request_filter_options.req_types`                  | array of strings | Populates the queue's "Request Type" filter dropdown — the distinct `req_type` values present in the queue.                                                                                |
| `request_filter_options.department_names`           | array of strings | Populates the queue's "Department" filter dropdown.                                                                                                                                        |

### `hospital_services[]`

| Field                          | Example                                                  | Notes                                                                                                                       |
| ------------------------------ | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `hospital_service_id`          | `"opd-normal"`                                           | Stable slug: `opd-normal` \| `opd-special` \| `ipd` \| `emergency`. Used as the `billing_services_by_hospital_service` key. |
| `legacy_charge_type_id`        | `"1"`                                                    | The legacy charge-type ID (`1`=OPD Normal, `2`=IPD, `3`=Emergency, `4`=OPD Special).                                        |
| `hospital_service_name`        | `"OPD Normal"`                                           | Shown on the service tile.                                                                                                  |
| `hospital_service_short_name`  | `"OPD"`                                                  | Unused visually today; keep for future badges.                                                                              |
| `hospital_service_title`       | `"Routine outpatient service"`                           | Tile subtitle.                                                                                                              |
| `hospital_service_description` | `"Collect for an existing outpatient visit or service."` | Tile body text.                                                                                                             |
| `display_tone`                 | `"blue"`                                                 | One of `blue` \| `violet` \| `teal` \| `coral` — controls tile accent color.                                                |
| `icon_name`                    | `"stethoscope"`                                          | Must be one of the names in `src/shared/components/Icon.jsx`.                                                               |

### `billing_services_by_hospital_service[hospital_service_id][request_type][]`

Each entry is an **executable workflow descriptor**, not display text:

| Field                           | Example                   | Notes                                                                                                                                                                       |
| ------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `billing_service_id`            | `"35"`                    | The visible billing-service master ID.                                                                                                                                      |
| `billing_service_name`          | `"Bill Settlement"`       | Shown in the Billing Service dropdown.                                                                                                                                      |
| `processing_billing_service_id` | `"21"`                    | The service ID the legacy write path actually uses — see `PROJECT_GUIDE.md` §9.2. Usually equal to `billing_service_id`; **differs** for IPD Bill Settlement (`35` → `21`). |
| `workflow_family`               | `"bill-settlement"`       | One of the 9 `WorkflowFamily` values — picks which React form renders.                                                                                                      |
| `legacy_mode`                   | `"ONLINEFINALSETTLEMENT"` | The `hmode` this dispatches to. `"SERVER_RESOLVED"` means "not yet a verified write route" — `checkEligibility` must reject it with `WORKFLOW_NOT_IMPLEMENTED`.             |

## Example response

```json
{
  "success": true,
  "trace_id": "trace-abc123",
  "data": {
    "business_date": "2026-09-13",
    "facility_details": {
      "facility_name": "HBIMS Hospital",
      "facility_subtitle": "Hospital Billing & Information Management"
    },
    "hospital_services": [
      {
        "hospital_service_id": "opd-normal",
        "legacy_charge_type_id": "1",
        "hospital_service_name": "OPD Normal",
        "hospital_service_short_name": "OPD",
        "hospital_service_title": "Routine outpatient service",
        "hospital_service_description": "Collect for an existing outpatient visit or service.",
        "display_tone": "blue",
        "icon_name": "stethoscope"
      },
      {
        "hospital_service_id": "ipd",
        "legacy_charge_type_id": "2",
        "hospital_service_name": "IPD",
        "hospital_service_short_name": "IPD",
        "hospital_service_title": "Inpatient account",
        "hospital_service_description": "Post advance, service or part payment against admission.",
        "display_tone": "teal",
        "icon_name": "bed"
      }
    ],
    "billing_services_by_hospital_service": {
      "opd-normal": {
        "Receipt": [
          {
            "billing_service_id": "10",
            "billing_service_name": "Service",
            "processing_billing_service_id": "10",
            "workflow_family": "tariff-entry",
            "legacy_mode": "OFFRECSER"
          }
        ],
        "Refund": [
          {
            "billing_service_id": "10",
            "billing_service_name": "Service",
            "processing_billing_service_id": "10",
            "workflow_family": "service-refund",
            "legacy_mode": "OFFREFUNDSER"
          }
        ],
        "Estimation": [
          {
            "billing_service_id": "10",
            "billing_service_name": "Service",
            "processing_billing_service_id": "10",
            "workflow_family": "tariff-entry",
            "legacy_mode": "OFFESTIMATION"
          }
        ]
      },
      "ipd": {
        "Receipt": [
          {
            "billing_service_id": "11",
            "billing_service_name": "Service",
            "processing_billing_service_id": "11",
            "workflow_family": "tariff-entry",
            "legacy_mode": "OFFRECSER"
          },
          {
            "billing_service_id": "19",
            "billing_service_name": "Advance",
            "processing_billing_service_id": "19",
            "workflow_family": "account-payment",
            "legacy_mode": "OFFRECADV"
          },
          {
            "billing_service_id": "35",
            "billing_service_name": "Bill Settlement",
            "processing_billing_service_id": "21",
            "workflow_family": "bill-settlement",
            "legacy_mode": "ONLINEFINALSETTLEMENT"
          }
        ],
        "Refund": [
          {
            "billing_service_id": "35",
            "billing_service_name": "Bill Settlement",
            "processing_billing_service_id": "21",
            "workflow_family": "bill-settlement-refund",
            "legacy_mode": "SERVER_RESOLVED"
          }
        ],
        "Estimation": [
          {
            "billing_service_id": "11",
            "billing_service_name": "Service",
            "processing_billing_service_id": "11",
            "workflow_family": "tariff-entry",
            "legacy_mode": "OFFESTIMATION"
          }
        ]
      }
    },
    "patient_seed_list": [],
    "pending_request_queue": [
      {
        "req_id": "BIL-2024-1200",
        "req_date": "13/09/2026",
        "pat_name": "Ajay Deshmukh",
        "department_name": "Cardiology",
        "category_name": "General",
        "cr_num": "939112600000004",
        "hospital_service_name": "OPD",
        "req_type": "Service",
        "req_amount": "480.00",
        "req_version": "1"
      }
    ],
    "tariff_group_names": [
      "All groups",
      "Consultation",
      "Accommodation",
      "Investigation",
      "Radiology",
      "Procedure",
      "Pharmacy"
    ],
    "tariff_catalog": [
      {
        "tariff_code": "CONS-101",
        "tariff_name": "Consultation — Cardiology",
        "tariff_group_name": "Consultation",
        "tariff_rate": 600
      }
    ],
    "collection_mode_options": [],
    "recent_transaction_rows": [
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
        "req_type": "Service",
        "hospital_service_name": "OPD",
        "billing_service_name": "Service"
      }
    ],
    "recent_estimate_rows": [],
    "payment_options": {
      "payment_modes": ["Cash", "Card", "UPI", "Cheque"],
      "payment_card_types": ["Debit Card", "Credit Card"],
      "payment_pos_terminals": ["T1", "T2", "T3"],
      "payment_restrictions_by_category": {
        "CGHS": { "Cheque": "not permitted for the CGHS category" }
      }
    },
    "pending_queue_summary": {
      "pending_request_count": "25",
      "today_pending_request_count": "25",
      "cash_in_drawer_amount": "96672.00"
    },
    "request_filter_options": {
      "hospital_service_names": ["IPD", "OPD"],
      "req_types": [
        "Advance Deposit",
        "Advance Refund",
        "Final Adjustment",
        "Refund",
        "Service"
      ],
      "department_names": [
        "Cardiology",
        "General Medicine",
        "Gynaecology",
        "Orthopaedics"
      ]
    }
  }
}
```
