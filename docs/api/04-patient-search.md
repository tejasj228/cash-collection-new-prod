# Patient search

```http
GET /api/cash-collection/patients?query=Rajesh%2C88420&hospitalServiceId=ipd&admittedOnly=true&page=0&size=10&sort=admittedOn%2Cdesc
```

Powers three things: the Direct Collection **"Find Patient"** CR lookup, the
IPD-only **"Existing Patients"** browsable list, and (optionally) a future
patient-search-by-name feature. Same endpoint, different `query` shape.

## Query parameters

| Param               | Type    | Notes                                                                                                                                                                                                                                                                                |
| ------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `query`             | string  | CR number, mobile, or name fragment. Multiple details may be comma-separated and must all match the same patient, for example `Rajesh, 88420`, `939112600000001, 41207`, or `Rajesh, 939112600000001, 41207`. Empty/omitted returns the browsable list.                              |
| `hospitalServiceId` | string  | One of `opd-normal` \| `opd-special` \| `ipd` \| `emergency`. **Filters by episode type**: `ipd` → only patients with an `IPD` episode; anything else → only `OPD` episodes. This is what makes "Existing Patients" show only admitted IPD patients, never the full hospital census. |
| `admittedOnly`      | boolean | When `true`, return only patients with a currently open admission. The IPD existing-patient picker always sends `true`.                                                                                                                                                              |
| `page` / `size`     | integer | The picker sends `page=0&size=10`. Search remains server-side across the full admitted-patient set; the response contains at most 10 matches.                                                                                                                                        |
| `sort`              | string  | Whitelisted sort. The picker sends `admittedOn,desc` so an empty search returns the 10 most recently admitted patients.                                                                                                                                                              |

Require a trimmed minimum query length for name/mobile searches (avoid a
table scan on 2 characters); permit exact CR/admission/account matches
regardless of length. Scope results to the hospital in session and to
episodes/accounts the logged-in user is allowed to bill.

## Patient object

| Field                     | Type             | Notes                                                                                                                                              |
| ------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                      | string           | Opaque patient key.                                                                                                                                |
| `name`                    | string           |                                                                                                                                                    |
| `age`                     | number           |                                                                                                                                                    |
| `sex`                     | string           | `"Male"` \| `"Female"` \| …                                                                                                                        |
| `cr`                      | string           | CR number, opaque, digits only in storage — the UI masks/compacts for display only.                                                                |
| `ipd`                     | string           | Admission number, or `"—"` if none.                                                                                                                |
| `account`                 | string           | Account number.                                                                                                                                    |
| `episode`                 | string           | e.g. `"IPD / General Medicine"` or `"OPD / Cardiology"` — format is `<OPD                                                                          | IPD | Emergency> / <department>`. |
| `status`                  | string           | e.g. `"Admitted"`, `"Visited today"` — display only.                                                                                               |
| `department`              | string           |                                                                                                                                                    |
| `unit`                    | string           |                                                                                                                                                    |
| `ward`                    | string           | `"—"` if not applicable.                                                                                                                           |
| `bed`                     | string           | `"—"` if not applicable.                                                                                                                           |
| `roomType`                | string           |                                                                                                                                                    |
| `consultant`              | string           |                                                                                                                                                    |
| `admittedOn`              | string           | `"DD/MM/YYYY · HH:mm"`, or `"—"`.                                                                                                                  |
| `category`                | string           | Patient/billing category, e.g. `"General"`, `"General — CGHS"`. Drives payment-mode restrictions — see [payment-options](./06-payment-options.md). |
| `mobile`                  | string           | Mask per your existing HBIMS display rules; do not leak a full number to a role that isn't authorized to see it.                                   |
| `abhaNumber`              | string           | Optional — ABDM/ABHA number shown as a chip on the patient banner.                                                                                 |
| `abhaAddress`             | string           | Optional — ABHA address (e.g. `name@abdm`).                                                                                                        |
| `eligibleChargeTypeIds`   | array of strings | Legacy charge-type IDs (`"1"`–`"4"`) this patient currently has an eligible episode for. Used by eligibility checks, not rendered directly.        |
| `accountOpen`             | boolean          | Whether an IPD account is currently open — gates Advance/Part-Payment/Settlement eligibility.                                                      |
| `refundableDocumentCount` | number           | How many prior receipts have refundable balance — `0` blocks refund eligibility.                                                                   |

## Example response

```json
{
  "success": true,
  "requestId": "trace-301",
  "data": [
    {
      "id": "3",
      "name": "Vikram Singh",
      "age": 61,
      "sex": "Male",
      "cr": "939112600000003",
      "ipd": "2024 0260 0071",
      "account": "2024 1726 0113",
      "episode": "IPD / Orthopaedics",
      "status": "Admitted",
      "department": "Orthopaedics",
      "unit": "Ortho Unit 1",
      "ward": "Ward 2A",
      "bed": "Bed 08",
      "roomType": "General ward",
      "consultant": "Dr P. Raghavan",
      "admittedOn": "02/09/2024 · 09:20",
      "category": "General",
      "mobile": "97xxx 88420",
      "abhaNumber": "14-1234-5678-9003",
      "abhaAddress": "vikram.singh@abdm",
      "eligibleChargeTypeIds": ["2"],
      "accountOpen": true,
      "refundableDocumentCount": 1
    }
  ]
}
```
