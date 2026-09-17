# Patient search

```http
GET /api/cash-collection/patients?pat_search=Rajesh%2C88420&hospital_service_id=ipd&admitted_only=true&page=0&size=10&admission_sort=admitted_on%2Cdesc
```

Powers three things: the Direct Collection **"Find Patient"** CR lookup, the
IPD-only **"Existing Patients"** browsable list, and (optionally) a future
patient-search-by-name feature. Same endpoint, different `pat_search` shape.

This search/list API is not the compact Patient Tile API used after a pending
request opens. That separate CR-only read is documented in
[`18-patient-tile-STAGED.md`](./18-patient-tile-STAGED.md).

## Query parameters

| Param                 | Type    | Notes                                                                                                                                                                                                                                                                                |
| --------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pat_search`          | string  | CR number, mobile, or name fragment. Multiple details may be comma-separated and must all match the same patient, for example `Rajesh, 88420`, `939112600000001, 41207`, or `Rajesh, 939112600000001, 41207`. Empty/omitted returns the browsable list.                              |
| `hospital_service_id` | string  | One of `opd-normal` \| `opd-special` \| `ipd` \| `emergency`. **Filters by episode type**: `ipd` → only patients with an `IPD` episode; anything else → only `OPD` episodes. This is what makes "Existing Patients" show only admitted IPD patients, never the full hospital census. |
| `admitted_only`       | boolean | When `true`, return only patients with a currently open admission. The IPD existing-patient picker always sends `true`.                                                                                                                                                              |
| `page` / `size`       | integer | The picker sends `page=0&size=10`. Search remains server-side across the full admitted-patient set; the response contains at most 10 matches.                                                                                                                                        |
| `admission_sort`      | string  | Whitelisted sort. The picker sends `admitted_on,desc` so an empty search returns the 10 most recently admitted patients.                                                                                                                                                             |

Require a trimmed minimum query length for name/mobile searches (avoid a
table scan on 2 characters); permit exact CR/admission/account matches
regardless of length. Scope results to the hospital in session and to
episodes/accounts the logged-in user is allowed to bill.

## Patient object

| Field                       | Type             | Notes                                                                                                                                              |
| --------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pat_name`                  | string           |                                                                                                                                                    |
| `pat_age`                   | number           |                                                                                                                                                    |
| `pat_sex`                   | string           | `"Male"` \| `"Female"` \| …                                                                                                                        |
| `cr_num`                    | string           | CR number, opaque, digits only in storage — the UI masks/compacts for display only.                                                                |
| `ipd_admission_num`         | string           | Admission number, or `"—"` if none.                                                                                                                |
| `account_num`               | string           | Account number.                                                                                                                                    |
| `episode_name`              | string           | e.g. `"IPD / General Medicine"` or `"OPD / Cardiology"` — format is `<OPD                                                                          | IPD | Emergency> / <department>`. |
| `admission_status`          | string           | e.g. `"Admitted"`, `"Visited today"` — display only.                                                                                               |
| `department_name`           | string           |                                                                                                                                                    |
| `unit_name`                 | string           |                                                                                                                                                    |
| `ward_name`                 | string           | `"—"` if not applicable.                                                                                                                           |
| `bed_name`                  | string           | `"—"` if not applicable.                                                                                                                           |
| `room_type_name`            | string           |                                                                                                                                                    |
| `consultant_name`           | string           |                                                                                                                                                    |
| `admitted_on`               | string           | `"DD/MM/YYYY · HH:mm"`, or `"—"`.                                                                                                                  |
| `category_name`             | string           | Patient/billing category, e.g. `"General"`, `"General — CGHS"`. Drives payment-mode restrictions — see [payment-options](./06-payment-options.md). |
| `mobile_num`                | string           | Mask per your existing HBIMS display rules; do not leak a full number to a role that isn't authorized to see it.                                   |
| `abha_num`                  | string           | Optional — ABDM/ABHA number shown as a chip on the patient banner.                                                                                 |
| `abha_address`              | string           | Optional — ABHA address (e.g. `name@abdm`).                                                                                                        |
| `eligible_charge_type_ids`  | array of strings | Legacy charge-type IDs (`"1"`–`"4"`) this patient currently has an eligible episode for. Used by eligibility checks, not rendered directly.        |
| `ipd_account_open`          | boolean          | Whether an IPD account is currently open — gates Advance/Part-Payment/Settlement eligibility.                                                      |
| `refundable_document_count` | number           | How many prior receipts have refundable balance — `0` blocks refund eligibility.                                                                   |

The patient banner displays CR number, Admission No., Age / Sex, Category,
Mobile, ABHA Number, and ABHA Address in its first chip row. Admission No. is
`ipd_admission_num` for IPD and `-` for OPD. The former second banner row
(Department/Unit, Ward/Bed, Room Type, Consultant, Admitted On) has been
removed; those fields remain in the patient contract for workflow/context
consumers and the five settlement-context boxes.

## Example response

```json
{
  "success": true,
  "trace_id": "trace-301",
  "data": [
    {
      "pat_name": "Vikram Singh",
      "pat_age": 61,
      "pat_sex": "Male",
      "cr_num": "939112600000003",
      "ipd_admission_num": "2024 0260 0071",
      "account_num": "2024 1726 0113",
      "episode_name": "IPD / Orthopaedics",
      "admission_status": "Admitted",
      "department_name": "Orthopaedics",
      "unit_name": "Ortho Unit 1",
      "ward_name": "Ward 2A",
      "bed_name": "Bed 08",
      "room_type_name": "General ward",
      "consultant_name": "Dr P. Raghavan",
      "admitted_on": "02/09/2024 · 09:20",
      "category_name": "General",
      "mobile_num": "97xxx 88420",
      "abha_num": "14-1234-5678-9003",
      "abha_address": "vikram.singh@abdm",
      "eligible_charge_type_ids": ["2"],
      "ipd_account_open": true,
      "refundable_document_count": 1
    }
  ]
}
```
