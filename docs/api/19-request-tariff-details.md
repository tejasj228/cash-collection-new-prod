# Request tariff details

```http
GET /api/cash-collection/requests/{req_no}/tariff-details?req_version={req_version}
```

This separate API returns tariff lines for **both OPD and IPD**. Department,
Episode, Patient Category, Ward Type, and Ward Name apply only to IPD and must
be omitted for OPD. OPD still receives and displays its tariff lines.

## OPD response

```json
{
  "success": true,
  "trace_id": "trace-tariff-opd-1",
  "data": {
    "req_no": "379137260000189",
    "req_version": "1",
    "hospital_service_name": "OPD",
    "pat_context_version": "379132000151071-v1",
    "tariff_lines": [
      {
        "tariff_code": "INV-001",
        "tariff_name": "Complete Blood Count",
        "quantity": 1,
        "tariff_rate": "300.00",
        "discount_amount": "0.00",
        "net_amount": "300.00",
        "details": []
      }
    ],
    "gross_amount": "300.00",
    "discount_amount": "0.00",
    "net_amount": "300.00"
  }
}
```

## IPD response

IPD uses the same tariff-line shape. IPD Final Adjustment additionally
returns the five boxes in `settlement_context`:

```json
{
  "success": true,
  "trace_id": "trace-tariff-ipd-1",
  "data": {
    "req_no": "379131260000233",
    "req_version": "1",
    "hospital_service_name": "IPD",
    "pat_context_version": "379132600003297-v1",
    "settlement_context": {
      "department_name": "Orthopaedics",
      "episode_name": "IPD Admission",
      "patient_category_name": "General",
      "ward_type_name": "General Ward",
      "ward_name": "Ortho Ward"
    },
    "tariff_lines": [],
    "gross_amount": "0.00",
    "discount_amount": "0.00",
    "net_amount": "0.00"
  }
}
```

| Field                                                       | OPD      | IPD                              |
| ----------------------------------------------------------- | -------- | -------------------------------- |
| `tariff_lines` and totals                                   | required | required                         |
| `settlement_context`                                        | absent   | present for IPD Final Adjustment |
| Department, Episode, Patient Category, Ward Type, Ward Name | absent   | inside `settlement_context`      |

The backend owns all rates, discounts, and totals. This endpoint is required
but is not yet wired to a live frontend call. Prototype tariff rows must not
be used as a production fallback.
