# Legacy HBIMS bridge (active staged integration)

The other files in this folder describe the target Spring Boot contract.
This file documents the two legacy endpoints that are active today for the
Pending Requests queue and Patient Info header. Their raw database-oriented
responses are translated at the frontend boundary; they are not the target
wire format.

Once the target `GET /requests`, `GET /requests/{req_no}`, and eligibility
endpoints are available, remove this bridge rather than extending its raw
shape across the application.

## Source files

| File                                         | Responsibility                                                                                                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/utilities/sessionService.js`            | Single source for API defaults, the local backend origin, legacy paths, SSO ticket capture/storage, User-Agent, `mode=1`, URL construction, and `fetchLegacyJson`. |
| `src/setupProxy.js`                          | CRA development proxy. Imports `LEGACY_BACKEND_ORIGIN` from `sessionService.js`; it contains no duplicate IP or environment lookup.                                |
| `src/services/legacyHbimsPendingRequests.js` | Maps `pendinglist` rows into the internal queue model.                                                                                                             |
| `src/services/legacyHbimsPatientInfo.js`     | Maps `patinfo` into the internal patient model, including `adm_no`.                                                                                                |
| `src/services/applicationRuntime.js`         | Loads the live queue before rendering and overlays the two staged read operations onto the prototype service shell.                                                |

## Configuration and session rules

There are no `.env` files and no `window.HBIMS_CASH_COLLECTION_CONFIG`.
Connection/session values live directly in `sessionService.js`:

- target REST base URL, credentials policy, and request timeout;
- local legacy backend origin;
- pending-list and patient-info paths;
- `varSSOTicketGrantingTicket`, `User-Agent`, and `mode=1` parameters.

HBIMS supplies `varSSOTicketGrantingTicket` in the page query string before
the hash route. The service caches it in memory and `sessionStorage`, so it
survives reloads in that tab but is not persisted in `localStorage`.

On localhost port 3000, requests go through the same-origin
`/legacy-hbims` proxy because the legacy server does not expose CORS headers.
Outside local development, endpoint URLs use `window.location.origin`.

Live queue loading is mandatory in development. A missing/expired ticket,
unreachable backend, invalid response, or non-2xx status rejects bootstrap
and displays the retry/error screen. It never falls back to prototype queue
rows.

## `pendinglist`

```http
GET {origin}/cashcollectionreqbased/pendinglist?varSSOTicketGrantingTicket=...&User-Agent=...&mode=1
```

The endpoint has no page/size inputs. Its database query returns at most the
top 101 rows, so the frontend fetches that array during bootstrap and performs
search, filtering, sorting, metrics, and pagination locally.

### Example raw row

```json
{
  "hospital_service_name": "Opd Normal-Investigation",
  "sblnum_bservice_id": 10,
  "sblnum_chargetype_id": 1,
  "pat_name": "Example Patient",
  "sblnum_ipd_chargetype_id": 0,
  "app_dtl": "/^/^/",
  "req_no": 379137260000189,
  "hblnum_req_type": 1,
  "sts": 1,
  "cr_num": 379132000151071,
  "req_date": "28-Aug-2026",
  "req_amount": 30,
  "req_type": "Receipt/Service"
}
```

### Mapping

| Raw field                     | Internal field     | Rule                                                                                                                                      |
| ----------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `req_no`                      | `id`               | Stringified unique request identifier.                                                                                                    |
| `req_date`                    | `date`, `dateIso`  | `DD-Mon-YYYY` becomes display `DD/MM/YYYY` plus internal ISO date.                                                                        |
| `pat_name`                    | `patient`          | Display name.                                                                                                                             |
| `cr_num`                      | `cr`               | The only patient identifier used by this bridge; stringified. No `pat_id` is required or forwarded.                                       |
| `sblnum_chargetype_id`        | `hospitalService`  | `1`/`4` → OPD, `2` → IPD, `3` → Emergency.                                                                                                |
| `hblnum_req_type`, `req_type` | `requestType`      | Numeric type `2` is an authoritative refund; text before `/` is the compatibility fallback. Determines routing and Collect/Refund action. |
| `req_type`                    | `requestTypeLabel` | Full backend string such as `Receipt/Service` or `Refund/Service`; displayed without splitting.                                           |
| `req_amount`                  | `amount`           | Formatted to an Indian-grouped two-decimal display value.                                                                                 |

The mapper does not use `hospital_service_name` to determine OPD/IPD because
that field contains a billing-service label. Refund visibility depends on the
backend query returning the row; the frontend no longer misclassifies a
returned refund as a collection.

## `patinfo`

```http
GET {origin}/cashcollectionreqbased/patinfo?varSSOTicketGrantingTicket=...&User-Agent=...&mode=1&crNo={cr_num}
```

The lookup uses only the queue row's CR number.

### Example raw response

```json
{
  "data": [
    {
      "father/mother/spouse name": "Example Guardian",
      "abha_num": "-",
      "mobile_num": "9000000000",
      "category_name": "General",
      "pat_name": "Example Patient",
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

### Mapping and display

| Raw field                   | Internal field        | Display behavior                                               |
| --------------------------- | --------------------- | -------------------------------------------------------------- |
| `crno`                      | `id`, `cr`            | Stringified and shown as the CR chip.                          |
| `adm_no`                    | `ipd`                 | Shown as the Admission No. chip for IPD; OPD always shows `-`. |
| `pat_name`                  | `name`                | Patient heading.                                               |
| `pat_age`                   | `age`, `sex`          | Split at `/` and displayed as one Age / Sex chip.              |
| `category_name`             | `category`            | Category chip.                                                 |
| `mobile_num`                | `mobile`              | Mobile chip.                                                   |
| `abha_num`                  | `abhaNumber`          | ABHA-number chip.                                              |
| `abha_address`              | `abhaAddress`         | ABHA-address chip.                                             |
| `father/mother/spouse name` | `guardianName`        | Retained on the model; not currently displayed.                |
| `patient_category_code`     | `patientCategoryCode` | Retained on the model; not currently displayed.                |

Blank and whitespace-only values normalize to `-`. The old second patient
summary row (Admission, Department/Unit, Ward/Bed, Room Type, Consultant,
Admitted On) has been removed. Admission is now in the first chip row; the
five settlement-context boxes below remain unchanged.

## Runtime behavior

During development, `applicationRuntime.js`:

1. creates the prototype service shell for operations whose live endpoints do
   not yet exist;
2. fetches `pendinglist` before rendering;
3. replaces the bootstrap request array and queue count with the live rows;
4. replaces queue query/metrics operations with the in-memory live array;
5. resolves an opened request only from the live array and fetches `patinfo`
   by CR number;
6. identifies live requests for the temporary eligibility pass-through.

There is deliberately no live-request-to-prototype fallback. Tariffs,
eligibility rules, posting, direct collection, dashboard, and shift endpoints
remain incomplete/live-unverified; the staged bridge must not be mistaken for
end-to-end transaction integration.

## Verification

Regression tests cover refund classification/full labels and `adm_no`
mapping. Before handing off changes, run:

```bash
npm test -- --runInBand
npm run build
npm run format:check
```
