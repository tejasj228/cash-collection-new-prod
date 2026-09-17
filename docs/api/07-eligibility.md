# Eligibility check

```http
POST /api/cash-collection/eligibility
```

Called at two moments: right after a clerk picks patient + service + request
type + billing service on **Direct Collection**, and right after opening a
request from the **Pending Requests** queue. Its result decides whether the
UI opens the workflow screen at all, and (for account/settlement workflows)
supplies every dropdown option and the settlement line-item breakdown the
next screen renders.

**Run the full rule order documented in `PROJECT_GUIDE.md` §9.3** — this
file only documents the wire shape, not the business rules.

## Request body

| Field                           | Type             | Notes                                                                                                                                                                                              |
| ------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `collection_source`             | string           | `"request"` \| `"direct"`.                                                                                                                                                                         |
| `req_no`                        | string, nullable | Present only when `collection_source: "request"`.                                                                                                                                                  |
| `req_version`                   | string, nullable | The request's `req_version`, for staleness detection.                                                                                                                                              |
| `request_type`                  | string           | `"Receipt"` \| `"Refund"` \| `"Estimation"`.                                                                                                                                                       |
| `pat_id`                        | string           |                                                                                                                                                                                                    |
| `cr_num`                        | string           |                                                                                                                                                                                                    |
| `hospital_service_id`           | string           | `opd-normal` \| `opd-special` \| `ipd` \| `emergency`.                                                                                                                                             |
| `charge_type_id`                | string           | The service's `legacyChargeTypeId` (`"1"`–`"4"`).                                                                                                                                                  |
| `billing_service_id`            | string           | The chosen billing option's `billing_service_id` from `billing_services_by_hospital_service`.                                                                                                      |
| `processing_billing_service_id` | string           | That option's `processing_billing_service_id` — sent back so the server can verify the client isn't out of sync, but the server always **re-resolves** this itself; never trust the client's copy. |
| `workflow_id`                   | string           | That option's `workflow_family`.                                                                                                                                                                   |

```json
{
  "collection_source": "direct",
  "req_no": null,
  "req_version": null,
  "request_type": "Receipt",
  "pat_id": "1",
  "cr_num": "939112600000001",
  "hospital_service_id": "ipd",
  "charge_type_id": "2",
  "billing_service_id": "35",
  "processing_billing_service_id": "21",
  "workflow_id": "bill-settlement"
}
```

## Response — eligible

| Field                 | Type    | Notes                                                                                                                                                                        |
| --------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `is_eligible`         | boolean | `true`.                                                                                                                                                                      |
| `eligibility_code`    | string  | `"ELIGIBLE"`.                                                                                                                                                                |
| `pat_context_version` | string  | Opaque. Every `workflow_fields` value the browser later posts must trace back to a `workflow_context` returned under this same version — reject a stale one at posting time. |
| `workflow_context`    | object  | See below.                                                                                                                                                                   |

### `workflow_context` (account/settlement workflows)

| Field                      | Type             | Notes                                                                                                                     |
| -------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `raising_department_names` | array of strings | Options for the "Department" dropdown.                                                                                    |
| `episode_names`            | array of strings | Options for the "Episode" dropdown, e.g. `["03-Sep-2026 / IPD"]`.                                                         |
| `patient_category_names`   | array of strings | Options for "Patient Category".                                                                                           |
| `ward_names`               | array of strings | Options for "Ward Type" (settlement only).                                                                                |
| `room_type_names`          | array of strings | Options for "Ward Name" (settlement only).                                                                                |
| `payment_payable_amount`   | number           | The account-payment amount shown/editable for Advance/Package/Part-Payment. **Not used** for Bill Settlement — see below. |
| `tariff_charge_breakdown`  | array            | **Required when `workflow_id` is `bill-settlement`.** See next section.                                                   |

> The frontend today accepts plain strings in these arrays (`["General Medicine"]`).
> A stricter `{id, label}` shape is fine too as long as `label` is what gets
> displayed — but keep it consistent, since these are also the values echoed
> back in `workflow_fields` on posting.

### Settlement breakdown

`tariff_charge_breakdown` is the read-only explanation of the amount a clerk is
about to settle — **never** return only a `payment_payable_amount` number for a
settlement; a total with no source lines can't be reviewed, and previously
caused the screen to show the wrong amount entirely.

| Field                     | Type   | Notes                                                                                                                |
| ------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| `tariff_code`             | string | Tariff code.                                                                                                         |
| `tariff_name`             | string | Tariff display name.                                                                                                 |
| `tariff_group_name`       | string | Groups rows in the settlement table: `Accommodation`, `Consultation`, `Investigation`, `Procedure`, `Pharmacy`, etc. |
| `tariff_rate`             | number | Effective per-unit rate after category/ward/package/effective-date pricing.                                          |
| `tariff_qty`              | number | Billable quantity.                                                                                                   |
| `tariff_discount_percent` | number | Percentage `0`–`100`.                                                                                                |

```text
lineGross = rate * qty
lineDiscount = lineGross * (discount / 100)
lineNet = max(0, lineGross - lineDiscount)
payableAmount = sum(lineNet for every line)   ← must equal payableAmount exactly
```

Compute with a decimal type, never a float/double. If the legacy calculation
includes credits, deposits, taxes or rounding that can't be represented as a
tariff line, return them as explicit named lines (or a separately typed
`payment_adjustments` array) — never hide a difference inside `payment_payable_amount`.

## Response — not eligible

Still a normal `200`, not an HTTP error:

```json
{
  "success": true,
  "trace_id": "trace-601",
  "data": {
    "is_eligible": false,
    "eligibility_code": "PATIENT_NOT_ADMITTED",
    "eligibility_message": "The patient must have a current admitted IPD episode for this transaction.",
    "workflow_context": null,
    "pat_context_version": "patient-1-v1",
    "workflow_context": null
  }
}
```

See `PROJECT_GUIDE.md` §9.3 for the full list of `eligibility_code` values and when to
return each one.

## Full "is_eligible" example (IPD Bill Settlement)

```json
{
  "success": true,
  "trace_id": "trace-602",
  "data": {
    "is_eligible": true,
    "eligibility_code": "ELIGIBLE",
    "pat_context_version": "patient-1-v1",
    "workflow_context": {
      "raising_department_names": ["General Medicine"],
      "episode_names": ["03-Sep-2026 / IPD"],
      "patient_category_names": ["General — CGHS"],
      "ward_names": ["Ward 4B"],
      "room_type_names": ["General ward"],
      "tariff_charge_breakdown": [
        {
          "tariff_code": "BED-2041",
          "tariff_name": "General ward bed charge / day",
          "tariff_group_name": "Accommodation",
          "tariff_rate": 1200.0,
          "tariff_qty": 6,
          "tariff_discount_percent": 0
        },
        {
          "tariff_code": "CONS-118",
          "tariff_name": "Consultation — General Medicine",
          "tariff_group_name": "Consultation",
          "tariff_rate": 400.0,
          "tariff_qty": 6,
          "tariff_discount_percent": 0
        },
        {
          "tariff_code": "INV-BUNDLE",
          "tariff_name": "Investigation package",
          "tariff_group_name": "Investigation",
          "tariff_rate": 6030.0,
          "tariff_qty": 1,
          "tariff_discount_percent": 0
        },
        {
          "tariff_code": "PROC-001",
          "tariff_name": "Minor procedure",
          "tariff_group_name": "Procedure",
          "tariff_rate": 500.0,
          "tariff_qty": 1,
          "tariff_discount_percent": 0
        },
        {
          "tariff_code": "PHARM-001",
          "tariff_name": "Pharmacy issue",
          "tariff_group_name": "Pharmacy",
          "tariff_rate": 1260.0,
          "tariff_qty": 1,
          "tariff_discount_percent": 0
        }
      ]
    }
  }
}
```
