# Payment options

```http
GET /api/cash-collection/payment-options?cr_num=939112600000004&category_name=General%20—%20CGHS&hospital_service_id=ipd&billing_service_id=35
```

Populates the Payment Mode / Card Type / POS Terminal dropdowns on the
**Payment Details** screen, and which modes show as "— not permitted" for
the current patient's category.

## Query parameters

| Param                 | Type   | Notes                                                                                                                                                                                                                                                                         |
| --------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cr_num`              | string | Optional patient context and the sole patient identifier.                                                                                                                                                                                                                     |
| `category_name`       | string | Optional context — lets the server pre-filter `payment_restrictions_by_category` for just this patient rather than shipping the whole table. The frontend today calls this with no context and applies `payment_restrictions_by_category` client-side; either approach works. |
| `hospital_service_id` | string | Optional selected hospital-service context.                                                                                                                                                                                                                                   |
| `billing_service_id`  | string | Optional selected billing-service context.                                                                                                                                                                                                                                    |

## Response fields

| Field                              | Type             | Notes                                                                                                                                                                                                       |
| ---------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `payment_modes`                    | array of strings | All modes this counter can offer, e.g. `["Cash", "Card", "UPI", "Cheque"]`.                                                                                                                                 |
| `payment_card_types`               | array of strings | e.g. `["Debit Card", "Credit Card"]`.                                                                                                                                                                       |
| `payment_pos_terminals`            | array of strings | Terminal IDs available to **this counter specifically** — never return terminals belonging to a different counter.                                                                                          |
| `payment_restrictions_by_category` | object           | Keyed by a **substring match** against the patient's `category_name` field (e.g. key `"CGHS"` matches a patient whose category is `"General — CGHS"`). Values hold named payment-mode restriction messages. |

The server must enforce every one of these restrictions again at posting
time even though the UI already disabled the choice — see
`PROJECT_GUIDE.md` §9.3.

## Example response

```json
{
  "success": true,
  "trace_id": "trace-501",
  "data": {
    "payment_modes": ["Cash", "Card", "UPI", "Cheque"],
    "payment_card_types": ["Debit Card", "Credit Card"],
    "payment_pos_terminals": ["T1", "T2", "T3"],
    "payment_restrictions_by_category": {
      "CGHS": { "Cheque": "not permitted for the CGHS category" }
    }
  }
}
```
