# Request detail

```http
GET /api/cash-collection/requests/{req_id}
```

Called the moment a clerk clicks **Collect** or **Refund** on a queue row.
`req_id` is the row's request identifier. Reload the request **authoritatively** —
never trust the amount/lines shown in the queue table; those are discovery
data only.

Return `404` if the request no longer exists, or a normal `200` with
`is_eligible: false, eligibility_code: "REQUEST_ALREADY_PROCESSED"` semantics is not
applicable here — this endpoint has no eligibility concept; eligibility is
checked separately by [`POST /eligibility`](./07-eligibility.md) right after
this loads. If another counter already completed the request, still return
the request's current data — the eligibility check is what will reject the
transaction with `REQUEST_ALREADY_PROCESSED`.

## Response fields

Same base fields as [a pending-request row](./02-pending-requests.md), plus:

| Field            | Type   | Notes                                                                                                                                                                                                                                                                                                              |
| ---------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `linked_patient` | object | The full [`Patient`](./04-patient-search.md#patient-object) object for the CR on this request.                                                                                                                                                                                                                     |
| `tariff_lines`   | array  | The request's authoritative charge lines — see shape below. Only present for tariff-entry-style requests (OPD Service/Refund, Investigation, Package); IPD Final Adjustment instead resolves its lines through [`checkEligibility`'s `workflowContext.chargeBreakdown`](./07-eligibility.md#settlement-breakdown). |

### `tariff_lines[]`

| Field                     | Type   | Notes                                              |
| ------------------------- | ------ | -------------------------------------------------- |
| `tariff_code`             | string | Tariff code.                                       |
| `tariff_name`             | string | Tariff display name.                               |
| `tariff_group_name`       | string | Tariff group (`Consultation`, `Investigation`, …). |
| `tariff_rate`             | number | Per-unit rate.                                     |
| `tariff_qty`              | number | Quantity already on the request.                   |
| `tariff_discount_percent` | number | Percentage, `0`–`100`.                             |

## Example response

```json
{
  "success": true,
  "trace_id": "trace-201",
  "data": {
    "req_id": "REF-2024-0193",
    "req_date": "03/09/2024",
    "pat_name": "Sunita Rao",
    "department_name": "Cardiology",
    "cr_num": "939112600000002",
    "hospital_service_name": "OPD",
    "req_type": "Refund",
    "req_amount": "1240.00",
    "req_version": "3",
    "linked_patient": {
      "pat_id": "2",
      "pat_name": "Sunita Rao",
      "cr_num": "939112600000002",
      "episode_name": "OPD / Cardiology",
      "admission_status": "Visited today",
      "department_name": "Cardiology",
      "category_name": "General"
    },
    "tariff_lines": [
      {
        "tariff_code": "CONS-101",
        "tariff_name": "Consultation — Cardiology",
        "tariff_group_name": "Consultation",
        "tariff_rate": 600,
        "tariff_qty": 1,
        "tariff_discount_percent": 0
      },
      {
        "tariff_code": "INV-3312",
        "tariff_name": "ECG — 12 lead",
        "tariff_group_name": "Investigation",
        "tariff_rate": 350,
        "tariff_qty": 1,
        "tariff_discount_percent": 0
      },
      {
        "tariff_code": "INV-2201",
        "tariff_name": "Complete blood count",
        "tariff_group_name": "Investigation",
        "tariff_rate": 290,
        "tariff_qty": 1,
        "tariff_discount_percent": 0
      }
    ]
  }
}
```
