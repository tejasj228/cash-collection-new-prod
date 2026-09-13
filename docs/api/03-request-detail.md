# Request detail

```http
GET /api/cash-collection/requests/{requestId}
```

Called the moment a clerk clicks **Collect** or **Refund** on a queue row.
`requestId` is the row's `req_id`. Reload the request **authoritatively** —
never trust the amount/lines shown in the queue table; those are discovery
data only.

Return `404` if the request no longer exists, or a normal `200` with
`eligible: false, code: "REQUEST_ALREADY_PROCESSED"` semantics is not
applicable here — this endpoint has no eligibility concept; eligibility is
checked separately by [`POST /eligibility`](./07-eligibility.md) right after
this loads. If another counter already completed the request, still return
the request's current data — the eligibility check is what will reject the
transaction with `REQUEST_ALREADY_PROCESSED`.

## Response fields

Same base fields as [a pending-request row](./02-pending-requests.md), plus:

| Field           | Type   | Notes                                                                                                                                                                                                                                                                                                              |
| --------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `linkedPatient` | object | The full [`Patient`](./04-patient-search.md#patient-object) object for the CR on this request.                                                                                                                                                                                                                     |
| `lines`         | array  | The request's authoritative charge lines — see shape below. Only present for tariff-entry-style requests (OPD Service/Refund, Investigation, Package); IPD Final Adjustment instead resolves its lines through [`checkEligibility`'s `workflowContext.chargeBreakdown`](./07-eligibility.md#settlement-breakdown). |

### `lines[]`

| Field      | Type   | Notes                                              |
| ---------- | ------ | -------------------------------------------------- |
| `code`     | string | Tariff code.                                       |
| `name`     | string | Tariff display name.                               |
| `group`    | string | Tariff group (`Consultation`, `Investigation`, …). |
| `rate`     | number | Per-unit rate.                                     |
| `qty`      | number | Quantity already on the request.                   |
| `discount` | number | Percentage, `0`–`100`.                             |

## Example response

```json
{
  "success": true,
  "requestId": "trace-201",
  "data": {
    "req_id": "REF-2024-0193",
    "req_date": "03/09/2024",
    "pat_name": "Sunita Rao",
    "department_name": "Cardiology",
    "cr_num": "939112600000002",
    "charge_type": "OPD Refund",
    "amount": "1240.00",
    "version": "3",
    "linkedPatient": {
      "id": "2",
      "name": "Sunita Rao",
      "cr": "939112600000002",
      "episode": "OPD / Cardiology",
      "status": "Visited today",
      "department": "Cardiology",
      "category": "General"
    },
    "lines": [
      {
        "code": "CONS-101",
        "name": "Consultation — Cardiology",
        "group": "Consultation",
        "rate": 600,
        "qty": 1,
        "discount": 0
      },
      {
        "code": "INV-3312",
        "name": "ECG — 12 lead",
        "group": "Investigation",
        "rate": 350,
        "qty": 1,
        "discount": 0
      },
      {
        "code": "INV-2201",
        "name": "Complete blood count",
        "group": "Investigation",
        "rate": 290,
        "qty": 1,
        "discount": 0
      }
    ]
  }
}
```
