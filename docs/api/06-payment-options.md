# Payment options

```http
GET /api/cash-collection/payment-options?patientCategory=General%20—%20CGHS
```

Populates the Payment Mode / Card Type / POS Terminal dropdowns on the
**Payment Details** screen, and which modes show as "— not permitted" for
the current patient's category.

## Query parameters

| Param             | Type   | Notes                                                                                                                                                                                                                                                     |
| ----------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `patientCategory` | string | Optional context — lets the server pre-filter `restrictionsByCategory` for just this patient rather than shipping the whole table. The frontend today calls this with no context and applies `restrictionsByCategory` client-side; either approach works. |

## Response fields

| Field                    | Type             | Notes                                                                                                                                                                                                                |
| ------------------------ | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `modes`                  | array of strings | All modes this counter can offer, e.g. `["Cash", "Card", "UPI", "Cheque"]`.                                                                                                                                          |
| `cardTypes`              | array of strings | e.g. `["Debit Card", "Credit Card"]`.                                                                                                                                                                                |
| `posTerminals`           | array of strings | Terminal IDs available to **this counter specifically** — never return terminals belonging to a different counter.                                                                                                   |
| `restrictionsByCategory` | object           | Keyed by a **substring match** against the patient's `category` field (e.g. key `"CGHS"` matches a patient whose category is `"General — CGHS"`). Value is `{ [mode]: "reason shown next to the disabled option" }`. |

The server must enforce every one of these restrictions again at posting
time even though the UI already disabled the choice — see
`PROJECT_GUIDE.md` §9.3.

## Example response

```json
{
  "success": true,
  "requestId": "trace-501",
  "data": {
    "modes": ["Cash", "Card", "UPI", "Cheque"],
    "cardTypes": ["Debit Card", "Credit Card"],
    "posTerminals": ["T1", "T2", "T3"],
    "restrictionsByCategory": {
      "CGHS": { "Cheque": "not permitted for the CGHS category" }
    }
  }
}
```
