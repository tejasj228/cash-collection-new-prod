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

| Field                        | Type             | Notes                                                                                                                                                                                    |
| ---------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source`                     | string           | `"request"` \| `"direct"`.                                                                                                                                                               |
| `requestId`                  | string, nullable | Present only when `source: "request"`.                                                                                                                                                   |
| `requestVersion`             | string, nullable | The request's `version`, for staleness detection.                                                                                                                                        |
| `requestType`                | string           | `"Receipt"` \| `"Refund"` \| `"Estimation"`.                                                                                                                                             |
| `patientId`                  | string           |                                                                                                                                                                                          |
| `crNumber`                   | string           |                                                                                                                                                                                          |
| `hospitalServiceId`          | string           | `opd-normal` \| `opd-special` \| `ipd` \| `emergency`.                                                                                                                                   |
| `chargeTypeId`               | string           | The service's `legacyChargeTypeId` (`"1"`–`"4"`).                                                                                                                                        |
| `billingServiceId`           | string           | The chosen billing option's `id` from `billingByService`.                                                                                                                                |
| `processingBillingServiceId` | string           | That option's `processingServiceId` — sent back so the server can verify the client isn't out of sync, but the server always **re-resolves** this itself; never trust the client's copy. |
| `workflowId`                 | string           | That option's `uiFamily`.                                                                                                                                                                |

```json
{
  "source": "direct",
  "requestId": null,
  "requestVersion": null,
  "requestType": "Receipt",
  "patientId": "1",
  "crNumber": "939112600000001",
  "hospitalServiceId": "ipd",
  "chargeTypeId": "2",
  "billingServiceId": "35",
  "processingBillingServiceId": "21",
  "workflowId": "bill-settlement"
}
```

## Response — eligible

| Field                   | Type    | Notes                                                                                                                                                                      |
| ----------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `eligible`              | boolean | `true`.                                                                                                                                                                    |
| `code`                  | string  | `"ELIGIBLE"`.                                                                                                                                                              |
| `patientContextVersion` | string  | Opaque. Every `workflowFields` value the browser later posts must trace back to a `workflowContext` returned under this same version — reject a stale one at posting time. |
| `workflowContext`       | object  | See below.                                                                                                                                                                 |

### `workflowContext` (account/settlement workflows)

| Field                | Type             | Notes                                                                                                                     |
| -------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `raisingDepartments` | array of strings | Options for the "Department" dropdown.                                                                                    |
| `episodes`           | array of strings | Options for the "Episode" dropdown, e.g. `["03-Sep-2026 / IPD"]`.                                                         |
| `patientCategories`  | array of strings | Options for "Patient Category".                                                                                           |
| `wards`              | array of strings | Options for "Ward Type" (settlement only).                                                                                |
| `roomTypes`          | array of strings | Options for "Ward Name" (settlement only).                                                                                |
| `payableAmount`      | number           | The account-payment amount shown/editable for Advance/Package/Part-Payment. **Not used** for Bill Settlement — see below. |
| `chargeBreakdown`    | array            | **Required when `workflowId` is `bill-settlement`.** See next section.                                                    |

> The frontend today accepts plain strings in these arrays (`["General Medicine"]`).
> A stricter `{id, label}` shape is fine too as long as `label` is what gets
> displayed — but keep it consistent, since these are also the values echoed
> back in `workflowFields` on posting.

### Settlement breakdown

`chargeBreakdown` is the read-only explanation of the amount a clerk is
about to settle — **never** return only a `payableAmount` number for a
settlement; a total with no source lines can't be reviewed, and previously
caused the screen to show the wrong amount entirely.

| Field      | Type   | Notes                                                                                                                |
| ---------- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| `code`     | string | Tariff code.                                                                                                         |
| `name`     | string | Tariff display name.                                                                                                 |
| `group`    | string | Groups rows in the settlement table: `Accommodation`, `Consultation`, `Investigation`, `Procedure`, `Pharmacy`, etc. |
| `rate`     | number | Effective per-unit rate after category/ward/package/effective-date pricing.                                          |
| `qty`      | number | Billable quantity.                                                                                                   |
| `discount` | number | Percentage `0`–`100`.                                                                                                |

```text
lineGross = rate * qty
lineDiscount = lineGross * (discount / 100)
lineNet = max(0, lineGross - lineDiscount)
payableAmount = sum(lineNet for every line)   ← must equal payableAmount exactly
```

Compute with a decimal type, never a float/double. If the legacy calculation
includes credits, deposits, taxes or rounding that can't be represented as a
tariff line, return them as explicit named lines (or a separately typed
`adjustments` array) — never hide a difference inside `payableAmount`.

## Response — not eligible

Still a normal `200`, not an HTTP error:

```json
{
  "success": true,
  "requestId": "trace-601",
  "data": {
    "eligible": false,
    "code": "PATIENT_NOT_ADMITTED",
    "message": "The patient must have a current admitted IPD episode for this transaction.",
    "workflow": null,
    "patientContextVersion": "patient-1-v1",
    "workflowContext": null
  }
}
```

See `PROJECT_GUIDE.md` §9.3 for the full list of `code` values and when to
return each one.

## Full "eligible" example (IPD Bill Settlement)

```json
{
  "success": true,
  "requestId": "trace-602",
  "data": {
    "eligible": true,
    "code": "ELIGIBLE",
    "patientContextVersion": "patient-1-v1",
    "workflowContext": {
      "raisingDepartments": ["General Medicine"],
      "episodes": ["03-Sep-2026 / IPD"],
      "patientCategories": ["General — CGHS"],
      "wards": ["Ward 4B"],
      "roomTypes": ["General ward"],
      "chargeBreakdown": [
        {
          "code": "BED-2041",
          "name": "General ward bed charge / day",
          "group": "Accommodation",
          "rate": 1200.0,
          "qty": 6,
          "discount": 0
        },
        {
          "code": "CONS-118",
          "name": "Consultation — General Medicine",
          "group": "Consultation",
          "rate": 400.0,
          "qty": 6,
          "discount": 0
        },
        {
          "code": "INV-BUNDLE",
          "name": "Investigation package",
          "group": "Investigation",
          "rate": 6030.0,
          "qty": 1,
          "discount": 0
        },
        {
          "code": "PROC-001",
          "name": "Minor procedure",
          "group": "Procedure",
          "rate": 500.0,
          "qty": 1,
          "discount": 0
        },
        {
          "code": "PHARM-001",
          "name": "Pharmacy issue",
          "group": "Pharmacy",
          "rate": 1260.0,
          "qty": 1,
          "discount": 0
        }
      ]
    }
  }
}
```
