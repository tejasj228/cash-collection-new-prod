# Patient tile (active staged integration)

The compact patient header comes from a dedicated API. It is not part of
request detail, eligibility, or tariff details.

## Active legacy endpoint

```http
GET {origin}/cashcollectionreqbased/patinfo?varSSOTicketGrantingTicket=...&User-Agent=...&mode=1&crNo={cr_num}
```

`cr_num` is the only patient identifier. Do not require `pat_id`.

```json
{
  "data": [
    {
      "father/mother/spouse name": "Ot Test",
      "abha_num": "-",
      "mobile_num": "9876543210",
      "category_name": "General",
      "pat_name": "Ot Test  ",
      "abha_address": "-",
      "patient_category_code": 11,
      "pat_age": "40 Yr/Male",
      "adm_no": "379132026000058",
      "crno": 379132600003297
    }
  ],
  "message": "Patient tile information fetched successfully",
  "status": "success"
}
```

| Raw field                   | Target field            | Rule                                                          |
| --------------------------- | ----------------------- | ------------------------------------------------------------- |
| `crno`                      | `cr_num`                | Stringify and display as the CR number.                       |
| `adm_no`                    | `ipd_admission_num`     | Show in the first patient-info row for IPD; show `-` for OPD. |
| `pat_name`                  | `pat_name`              | Trim trailing whitespace.                                     |
| `pat_age`                   | `pat_age`, `pat_sex`    | Parse a combined value such as `40 Yr/Male`.                  |
| `category_name`             | `category_name`         | Display patient category.                                     |
| `patient_category_code`     | `patient_category_code` | Stringify and retain as reference data.                       |
| `mobile_num`                | `mobile_num`            | Display phone number.                                         |
| `abha_num`, `abha_address`  | matching fields         | Display as returned; use `-` when absent.                     |
| `father/mother/spouse name` | `guardian_name`         | Guardian display value.                                       |

This API does not return tariff lines or the IPD-only Department, Episode,
Patient Category, Ward Type, and Ward Name settlement fields.

## Target endpoint

```http
GET /api/cash-collection/patients/{cr_num}/tile
```

The normalized response is the `PatientTile` schema in
[`contracts/openapi.yaml`](../../contracts/openapi.yaml). For OPD, return
`"ipd_admission_num": "-"`.
