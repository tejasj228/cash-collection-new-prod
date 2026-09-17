# Direct tariff catalogue and selection popup

```http
GET /api/cash-collection/tariffs?cr_num=379132000151071&hospital_service_id=opd-normal&billing_service_id=10&workflow_id=tariff-entry&page=0&size=10
```

This is the patient/workflow-scoped catalogue for adding charges. It is not
the raised-request `cashcollectionreqbased/tariffdetails?reqNo=...` endpoint.

## Inputs

| Parameter                           | Purpose                                                           |
| ----------------------------------- | ----------------------------------------------------------------- |
| `cr_num`                            | Sole patient identifier.                                          |
| `hospital_service_id`               | Current Direct service.                                           |
| `billing_service_id`, `workflow_id` | Current supported billing workflow.                               |
| `tariff_search`                     | Code/name text; empty returns all eligible tariffs through pages. |
| `tariff_group_id`                   | Optional group filter.                                            |
| `page`, `size`                      | Zero-based page, size 10.                                         |

Backend resolves hospital/counter/authentication, admission state, category,
ward, package, workflow permission, tariff eligibility, and authoritative
rates. Filter before pagination; never return an unscoped global master.

## Response

```json
{
  "success": true,
  "trace_id": "trace-tariffs-1",
  "data": {
    "items": [
      {
        "tariff_code": "1210137",
        "tariff_name": "Urine Ketones",
        "tariff_group_name": "Biochemistry",
        "tariff_rate": 30
      }
    ],
    "total": 125,
    "page": 0,
    "size": 10
  }
}
```

Rate must be finite and nonnegative. Identifiers are strings. The adapter
maps code/name/group/rate to the existing tariff model. The total represents
all matching eligible tariffs, not just the page size.

## Frontend behaviour

In an ordinary charge-entry screen, focus the add-tariff input and press
Enter while blank/whitespace-only to open Select tariffs. The popup reads
ten rows per API page, searches across the backend catalogue, and supports
checkbox selections across pages. Add selected appends manual lines with
quantity 1 and discount 0; selecting an already-added manual code increments
its quantity. Cancel/Escape/backdrop close discards the pending selection.

Typed input uses the same API for suggestions (debounced 250ms), showing up
to six matches. There is no fixture/bootstrap tariff fallback on API errors.
Existing Refund/Estimation rules hide the add controls; settlement/account
workflows retain their existing layouts rather than receive this popup.
Existing quantity/discount/positive-total controls remain in API 19.

## Integration status

Frontend calls `getTariffPage` at the existing target REST path. Local legacy
mode uses the backend proxy/base from `sessionService.js`. The actual Direct
catalogue URL/payload is still needed from the teammate if it differs; the
supplied request tariff endpoint cannot substitute for the full catalogue.
Real DB execution is unverified. Errors remain visible and prevent adding
unavailable tariffs. API 20 summarizes the Direct picker workflow.
