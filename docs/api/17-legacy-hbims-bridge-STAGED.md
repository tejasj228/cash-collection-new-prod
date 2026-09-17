# Legacy HBIMS pending-list bridge (active staged integration)

This file documents only the active legacy `pendinglist` endpoint. Patient
tile data is a separate call documented in
[`18-patient-tile-STAGED.md`](./18-patient-tile-STAGED.md). Request tariff
lines for OPD and IPD are documented in
[`19-request-tariff-details.md`](./19-request-tariff-details.md).

## Source files

| File                                         | Responsibility                                                                                                                                     |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/utilities/sessionService.js`            | Single source for API defaults, backend origin, legacy paths, SSO ticket handling, User-Agent, `mode=1`, URL construction, and the request helper. |
| `src/services/legacyHbimsPendingRequests.js` | Maps raw `pendinglist` rows into the internal queue model.                                                                                         |
| `src/services/applicationRuntime.js`         | Loads the live queue before rendering and overlays staged reads onto the prototype service shell.                                                  |

There are no `.env` files or `window.*` runtime configuration objects. The
connection and session values live directly in `sessionService.js`.

## Active endpoint

```http
GET {origin}/cashcollectionreqbased/pendinglist?varSSOTicketGrantingTicket=...&User-Agent=...&mode=1
```

The endpoint returns up to 101 rows. Search, filtering, sorting, metrics, and
pagination are temporarily performed over that live array in the frontend.

```json
{
  "hospital_service_name": "Opd Normal-Investigation",
  "sblnum_chargetype_id": 1,
  "pat_name": "Example Patient",
  "req_no": 379137260000189,
  "hblnum_req_type": 1,
  "cr_num": 379132000151071,
  "req_date": "28-Aug-2026",
  "req_amount": 30,
  "req_type": "Receipt/Service"
}
```

| Raw field                     | Internal field     | Rule                                                                     |
| ----------------------------- | ------------------ | ------------------------------------------------------------------------ |
| `req_no`                      | `id`               | Stringified request identifier.                                          |
| `req_date`                    | `date`, `dateIso`  | Convert the legacy date into display and ISO forms.                      |
| `pat_name`                    | `patient`          | Display name.                                                            |
| `cr_num`                      | `cr`               | Sole patient identifier. No `pat_id` is used.                            |
| `sblnum_chargetype_id`        | `hospitalService`  | `1`/`4` → OPD, `2` → IPD, `3` → Emergency.                               |
| `hblnum_req_type`, `req_type` | `requestType`      | Numeric type `2` is a refund; the text is a compatibility fallback.      |
| `req_type`                    | `requestTypeLabel` | Display the full value, such as `Receipt/Service`, without splitting it. |
| `req_amount`                  | `amount`           | Indian-grouped two-decimal display value.                                |

Refund visibility still depends on the backend query returning the refund
row. A returned refund is no longer classified as a collection by the
frontend.

Opening a live request independently loads the Patient Tile API by CR number.
The tariff-details endpoint is not yet wired live. A failed legacy call shows
the retry/error screen and never falls back to dummy request rows.
