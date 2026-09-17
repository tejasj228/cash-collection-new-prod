# Request tariff details

```http
GET /api/cash-collection/requests/{req_no}/tariff-details?req_version={req_version}
```

**One endpoint, one `tariff_lines` shape, for both OPD and IPD.** The
backend never groups or pre-totals anything — it always returns a flat list
of tariff lines with a `tariff_group_name` per line, and the frontend does
100% of the grouping/summing/drill-down locally from that one array (see
"How the frontend renders this" below). The only thing that varies by case
is whether `settlement_context` is present.

Called right after [`checkEligibility`](./07-eligibility.md) succeeds, for
every workflow that shows a tariff table (i.e. every request-based workflow
except Advance Deposit/Advance Refund, which only ever show a single
editable amount and never call this endpoint).

## Response fields

| Field                   | Type                                          | Notes                                                                      |
| ----------------------- | --------------------------------------------- | -------------------------------------------------------------------------- |
| `req_no`                | string                                        |                                                                            |
| `req_version`           | string                                        | Echo it back; must match on posting.                                       |
| `hospital_service_name` | string                                        | `"OPD"` \| `"IPD"` \| `"Emergency"`.                                       |
| `tariff_lines`          | array                                         | See below. Same shape for OPD and IPD — never omit it, never pre-group it. |
| `settlement_context`    | object, present only for IPD Final Adjustment | See below. Absent for every other case, OPD included.                      |

### `tariff_lines[]`

Uses the shared tariff-line fields (`05-tariffs.md` and
`contracts/openapi.yaml`'s `TariffLine`) — reuse the same
field names, do not invent new ones:

| Field                     | Type   | Notes                                                                                                                                                                                      |
| ------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tariff_code`             | string | Tariff code.                                                                                                                                                                               |
| `tariff_name`             | string | Tariff display name.                                                                                                                                                                       |
| `tariff_group_name`       | string | `Accommodation`, `Consultation`, `Investigation`, `Procedure`, `Pharmacy`, etc. — this is what the frontend groups by for IPD Final Adjustment; ignored (rows shown flat) everywhere else. |
| `tariff_rate`             | number | Per-unit rate.                                                                                                                                                                             |
| `tariff_qty`              | number | Quantity.                                                                                                                                                                                  |
| `tariff_discount_percent` | number | Percentage, `0`–`100`.                                                                                                                                                                     |

The frontend computes `lineGross = rate * qty`, `lineDiscount = lineGross *
(discount / 100)`, `lineNet = max(0, lineGross - lineDiscount)`, and every
total, itself — do not also return `gross_amount`/`discount_amount`/`net_amount`;
nothing reads them and they can drift out of sync with the lines.

### `settlement_context` (IPD Final Adjustment only)

Absent for OPD and for every IPD workflow except Final Adjustment (Bill
Settlement). Every value is server-authoritative and the frontend always
displays it read-only — never sent back as a picker.

| Field                      | Type             | Shown as                                                                                                                                    |
| -------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `raising_department_names` | array of strings | "Department"                                                                                                                                |
| `episode_names`            | array of strings | "Episode"                                                                                                                                   |
| `patient_category_names`   | array of strings | "Patient Category"                                                                                                                          |
| `room_type_names`          | array of strings | **"Ward Type"** — note the label doesn't match the field name; this is the existing, established mapping (`apiWireMappers.js`), not a typo. |
| `ward_names`               | array of strings | **"Ward Name"** — likewise mapped from `ward_names`, not `room_type_names`.                                                                 |

> These arrays only ever carry one real value in HBIMS today (the
> frontend just reads the first element) — still return an array, not a
> bare string, since that's what the frontend's `firstContextValue()`
> expects. A bare string here will silently be ignored in favor of the
> patient's own fallback value instead of erroring, so this is easy to get
> wrong without noticing.

## Example — OPD (or any non-settlement IPD workflow)

```json
{
  "success": true,
  "trace_id": "trace-tariff-1",
  "data": {
    "req_no": "379137260000189",
    "req_version": "1",
    "hospital_service_name": "OPD",
    "tariff_lines": [
      {
        "tariff_code": "INV-2201",
        "tariff_name": "Complete blood count",
        "tariff_group_name": "Investigation",
        "tariff_rate": 290,
        "tariff_qty": 1,
        "tariff_discount_percent": 0
      }
    ]
  }
}
```

## Example — IPD Final Adjustment (Bill Settlement)

```json
{
  "success": true,
  "trace_id": "trace-tariff-2",
  "data": {
    "req_no": "379131260000233",
    "req_version": "1",
    "hospital_service_name": "IPD",
    "settlement_context": {
      "raising_department_names": ["Orthopaedics"],
      "episode_names": ["03-Sep-2026 / IPD"],
      "patient_category_names": ["General"],
      "room_type_names": ["General ward"],
      "ward_names": ["Ortho Ward"]
    },
    "tariff_lines": [
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
        "tariff_name": "Consultation — Orthopaedics",
        "tariff_group_name": "Consultation",
        "tariff_rate": 400.0,
        "tariff_qty": 6,
        "tariff_discount_percent": 0
      }
    ]
  }
}
```

## How the frontend renders this (`BillingDetails.jsx`)

- **OPD, and every IPD workflow that isn't Final Adjustment** (Service,
  Refund, Investigation Charges, Package Collection, Estimation):
  `ChargeBuilder` shows `tariff_lines` as a flat, editable table — one row
  per line, a checkbox to include/exclude it, editable qty/discount. No
  grouping, no drill-down popup.
- **IPD Final Adjustment only**: `AccountWorkflowBuilder` groups the exact
  same `tariff_lines` client-side by `tariff_group_name` into one summary
  row per group (`Accommodation`, `Consultation`, …) with a Discount Amt /
  Net Amt total per group. Clicking a group's "Details" icon opens
  `TariffDetailsDialog`, which just filters that same array down to the
  lines in that one group — **this is a client-side filter, not a second
  API call.** Its Req No. / Req Date / Department / Payment Mode / Mode
  columns come from the request already loaded and the in-progress payment
  selection, not from this endpoint — Payment Mode reads "—" until the
  clerk actually picks one on the next screen.
- **Advance Deposit / Advance Refund**: never calls this endpoint at all —
  those workflows only show a single editable amount field.

## Frontend integration

`CashCollection.jsx` now calls `getRequestTariffDetails` after request
eligibility succeeds, except for Advance Deposit/Advance Refund. The API
adapter calls this endpoint and `mapRequestTariffDetailsWire` maps its flat
lines and optional settlement context to the existing workspace model.
Eligibility no longer supplies settlement/tariff data. Patient tile loading
remains a separate call.

Local development sends this target API through the backend origin/proxy
defined in `sessionService.js`; production uses the configured same-origin
REST base. The legacy pending list currently supplies no request version,
so its first tariff read omits `req_version` and adopts the returned version.
The backend must support this initial read or add `req_version` to the pending
list. Subsequent reads with a known version must reject stale state.

Missing endpoints, malformed responses, mismatched request IDs, and stale
versions stop request opening with an error, never dummy tariff data. The
frontend wiring is implemented; live backend availability is not verified.
