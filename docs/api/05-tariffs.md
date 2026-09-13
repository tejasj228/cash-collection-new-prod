# Tariff catalogue

```http
GET /api/cash-collection/tariffs?group=Investigation&query=blood
```

Powers the tariff type-ahead search in **Tariff Details** / **Estimated
Tariff Details** (the box labelled "Enter tariff code or name to add a
charge") and the group dropdown above it.

## Query parameters

| Param   | Type   | Notes                                                                                                        |
| ------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| `group` | string | One of the `tariffGroups` strings from [bootstrap](./01-bootstrap.md), or omit/`"All groups"` for no filter. |
| `query` | string | Matches tariff code or name, case-insensitive substring.                                                     |

> **Current frontend behavior:** `ChargeBuilder.jsx` calls this once with no
> filters, caches the full `tariffCatalog` from bootstrap, and does the
> group/text filtering **client-side** (top 6 matches shown as you type). A
> real backend should still support server-side `group`/`query` filtering
> for a large catalogue — just know that until the frontend is changed to
> call this endpoint per keystroke, only the **unfiltered** bootstrap-time
> call matters in practice. Either behavior satisfies today's UI.

Tariff eligibility in a real deployment depends on hospital service, request
type, billing service, patient category, ward, and package state — do not
implement one global unscoped tariff list if your legacy tariff master
requires that context (see `PROJECT_GUIDE.md` §9.3, step 8).

## Response fields

| Field   | Type   | Notes                                                                                                                                                                          |
| ------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `code`  | string | Tariff code, e.g. `"INV-2201"`.                                                                                                                                                |
| `name`  | string | e.g. `"Complete blood count"`.                                                                                                                                                 |
| `group` | string | Must be one of `tariffGroups`.                                                                                                                                                 |
| `rate`  | number | Per-unit rate. **This is the one field in the whole API that is a JSON number, not a string** — matches `contracts/openapi.yaml`'s `Tariff` schema (`rate: { type: number }`). |

## Example response

```json
{
  "success": true,
  "requestId": "trace-401",
  "data": [
    {
      "code": "CONS-101",
      "name": "Consultation — Cardiology",
      "group": "Consultation",
      "rate": 600
    },
    {
      "code": "INV-2201",
      "name": "Complete blood count",
      "group": "Investigation",
      "rate": 290
    },
    {
      "code": "INV-3312",
      "name": "ECG — 12 lead",
      "group": "Investigation",
      "rate": 350
    },
    {
      "code": "BED-2041",
      "name": "General ward bed charge / day",
      "group": "Accommodation",
      "rate": 1200
    }
  ]
}
```
