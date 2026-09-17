# Tariff catalogue

```http
GET /api/cash-collection/tariffs?tariff_group_id=Investigation&cr_num=939112600000004&workflow_id=tariff-entry&tariff_search=blood
```

Powers the tariff type-ahead search in **Tariff Details** / **Estimated
Tariff Details** (the box labelled "Enter tariff code or name to add a
charge") and the group dropdown above it.

## Query parameters

| Param             | Type   | Notes                                                                                                              |
| ----------------- | ------ | ------------------------------------------------------------------------------------------------------------------ |
| `tariff_group_id` | string | One of the `tariff_group_names` strings from [bootstrap](./01-bootstrap.md), or omit/`"All groups"` for no filter. |
| `cr_num`          | string | Required patient context and the sole patient identifier.                                                          |
| `workflow_id`     | string | Required selected workflow context.                                                                                |
| `tariff_search`   | string | Matches tariff code or name, case-insensitive substring.                                                           |

> **Current frontend behavior:** `BillingDetails.jsx` reads `tariffCatalog`
> and `tariffGroups` from bootstrap and filters locally (up to six matches).
> It does not call this endpoint on mount or per keystroke. The adapter exposes
> `getTariffs` for a future catalogue refresh/server search. Tile rendering
> and line rules are documented once in [API 19](./19-request-tariff-details.md).

Tariff eligibility in a real deployment depends on hospital service, request
type, billing service, patient category, ward, and package state — do not
implement one global unscoped tariff list if your legacy tariff master
requires that context (see `PROJECT_GUIDE.md` §9.3, step 8).

## Response fields

| Field               | Type   | Notes                                                                                                                                                                                 |
| ------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tariff_code`       | string | Tariff code, e.g. `"INV-2201"`.                                                                                                                                                       |
| `tariff_name`       | string | e.g. `"Complete blood count"`.                                                                                                                                                        |
| `tariff_group_name` | string | Must be one of `tariff_group_names`.                                                                                                                                                  |
| `tariff_rate`       | number | Per-unit rate. **This is the one field in the whole API that is a JSON number, not a string** — matches `contracts/openapi.yaml`'s `Tariff` schema (`tariff_rate: { type: number }`). |

## Example response

```json
{
  "success": true,
  "trace_id": "trace-401",
  "data": [
    {
      "tariff_code": "CONS-101",
      "tariff_name": "Consultation — Cardiology",
      "tariff_group_name": "Consultation",
      "tariff_rate": 600
    },
    {
      "tariff_code": "INV-2201",
      "tariff_name": "Complete blood count",
      "tariff_group_name": "Investigation",
      "tariff_rate": 290
    },
    {
      "tariff_code": "INV-3312",
      "tariff_name": "ECG — 12 lead",
      "tariff_group_name": "Investigation",
      "tariff_rate": 350
    },
    {
      "tariff_code": "BED-2041",
      "tariff_name": "General ward bed charge / day",
      "tariff_group_name": "Accommodation",
      "tariff_rate": 1200
    }
  ]
}
```
