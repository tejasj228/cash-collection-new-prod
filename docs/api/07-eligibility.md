# Eligibility check

```http
POST /api/cash-collection/eligibility
```

Called after the clerk selects a patient/workflow or opens a pending request.
It answers whether the transaction may proceed and returns a patient-context
version for later posting. It does not transport Patient Tile fields, tariff
lines, or IPD settlement context; those are separate APIs 18 and 19.

Run the rule order in `PROJECT_GUIDE.md` §9.3. This document defines only the
wire shape.

## Request body

| Field                           | Type             | Notes                                                         |
| ------------------------------- | ---------------- | ------------------------------------------------------------- |
| `collection_source`             | string           | `request` or `direct`.                                        |
| `req_no`                        | string, nullable | Present for request-based collection.                         |
| `req_version`                   | string, nullable | Opaque request version for stale-state checks.                |
| `request_type`                  | string           | `Receipt`, `Refund`, or `Estimation`.                         |
| `cr_num`                        | string           | Sole patient identifier.                                      |
| `hospital_service_id`           | string           | `opd-normal`, `opd-special`, `ipd`, or `emergency`.           |
| `charge_type_id`                | string           | Legacy charge-type ID from the selected service.              |
| `billing_service_id`            | string           | Selected billing-service ID.                                  |
| `processing_billing_service_id` | string           | Client echo; server must resolve and verify it independently. |
| `workflow_id`                   | string           | Selected workflow family.                                     |

```json
{
  "collection_source": "request",
  "req_no": "379131260000233",
  "req_version": "1",
  "request_type": "Receipt",
  "cr_num": "379132600003297",
  "hospital_service_id": "ipd",
  "charge_type_id": "2",
  "billing_service_id": "35",
  "processing_billing_service_id": "21",
  "workflow_id": "bill-settlement"
}
```

## Eligible response

```json
{
  "success": true,
  "trace_id": "trace-eligibility-1",
  "data": {
    "is_eligible": true,
    "eligibility_code": "ELIGIBLE",
    "pat_context_version": "379132600003297-v1",
    "workflow_context": {
      "payment_payable_amount": null
    }
  }
}
```

| Field                 | Type             | Notes                                                                          |
| --------------------- | ---------------- | ------------------------------------------------------------------------------ |
| `is_eligible`         | boolean          | `true`.                                                                        |
| `eligibility_code`    | string           | `ELIGIBLE`.                                                                    |
| `pat_context_version` | string           | Opaque version echoed during posting.                                          |
| `workflow_context`    | object, nullable | May contain non-tariff workflow values needed by direct account-payment flows. |

For request-based OPD/IPD tariff workflows, load tariff lines from
[`GET /requests/{req_no}/tariff-details`](./19-request-tariff-details.md)
after eligibility succeeds. For IPD Final Adjustment, that same API also
returns the five IPD-only settlement fields. Do not put
`tariff_charge_breakdown`, Department, Episode, Patient Category, Ward Type,
or Ward Name in `workflow_context`.

## Not-eligible response

Business rejection remains HTTP 200:

```json
{
  "success": true,
  "trace_id": "trace-eligibility-2",
  "data": {
    "is_eligible": false,
    "eligibility_code": "PATIENT_NOT_ADMITTED",
    "eligibility_message": "The patient must have a current admitted IPD episode for this transaction.",
    "pat_context_version": "379132600003297-v1",
    "workflow_context": null
  }
}
```

See `PROJECT_GUIDE.md` §9.3 for eligibility codes and evaluation order.
