# Request detail

```http
GET /api/cash-collection/requests/{req_no}
```

Called when a clerk clicks **Collect** or **Refund** on a queue row. `req_no`
is the row's request identifier. This endpoint reloads request metadata only.
The adapter separately loads the [Patient Tile](./18-patient-tile-STAGED.md)
by CR number and [Request Tariff Details](./19-request-tariff-details.md) by
request number. Do not combine those payloads into this response.

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
Do not return `linked_patient`, `workflow_context`, or `tariff_lines` here.

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
    "req_version": "3"
  }
}
```
