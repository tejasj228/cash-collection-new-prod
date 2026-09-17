# Request detail

```http
GET /api/cash-collection/requests/{req_no}
```

Called when a clerk clicks **Collect** or **Refund** on a queue row. `req_no`
is the row's request identifier. The current target REST adapter reads request
metadata, `linked_patient`, and `tariff_lines` from this response. Rendering
and the shared tariff-line shape are documented once in
[Tariff tile contract](./19-request-tariff-details.md).
The local legacy adapter instead independently loads `patinfo` by CR number;
see [Patient Tile](./18-patient-tile-STAGED.md). These are different integration
paths, not a second tariff-details call.

Return `404` if the request no longer exists, or a normal `200` with
`is_eligible: false, eligibility_code: "REQUEST_ALREADY_PROCESSED"` semantics is not
applicable here — this endpoint has no eligibility concept; eligibility is
checked separately by [`POST /eligibility`](./07-eligibility.md) right after
this loads. If another counter already completed the request, still return
the request's current data — the eligibility check is what will reject the
transaction with `REQUEST_ALREADY_PROCESSED`.

## Response fields

Return the same authoritative base fields as a
[pending-request row](./02-pending-requests.md), including `req_version`.
Also return `linked_patient` using the OpenAPI `Patient` shape and flat
`tariff_lines` using `TariffLine`. Settlement/account context comes from
eligibility's `workflow_context`; see API 19 for exact mapping and precedence.

## Example response

```json
{
  "success": true,
  "trace_id": "trace-201",
  "data": {
    "req_no": "REF-2024-0193",
    "req_date": "03/09/2024",
    "pat_name": "Sunita Rao",
    "department_name": "Cardiology",
    "cr_num": "939112600000002",
    "hospital_service_name": "OPD",
    "req_type": "Refund",
    "req_amount": "1240.00",
    "req_version": "3",
    "linked_patient": {
      "cr_num": "939112600000002",
      "pat_name": "Sunita Rao",
      "pat_age": 35,
      "pat_sex": "Female",
      "category_name": "General"
    },
    "tariff_lines": [
      {
        "tariff_code": "INV-001",
        "tariff_name": "Investigation",
        "tariff_group_name": "Investigation",
        "tariff_rate": 1240,
        "tariff_qty": 1,
        "tariff_discount_percent": 0
      }
    ]
  }
}
```
