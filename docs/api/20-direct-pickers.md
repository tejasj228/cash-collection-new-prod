# Direct collection — patient and tariff pickers

## Current legacy patient workflow

1. Select any of OPD Normal, OPD Special, Emergency, or IPD.
2. Existing Patients uses the loaded real pending-list population, not a
   separate patient endpoint or fixture patients. Deduplicate by CR and sort
   by latest pending date. Show ten candidates per page.
3. CRs with an IPD request are assigned to IPD; remaining CRs are shared by
   the other three options. This service grouping is temporary admission
   fallback, not proof of current admission.
4. Fetch each displayed candidate's real `patinfo` for phone/header data.
   Search names/CRs across pending candidates; phone queries use cached detail
   reads in batches of at most ten (may scan several batches).
5. Enter an exact pending-list CR or select a candidate, then Continue
   refreshes the tile and validates the candidate/service/workflow.
6. Missing current admission status does not block legacy candidates. When
   explicit `is_admitted`/recognized status exists, enforce admitted → IPD
   only; non-admitted → OPD Normal, OPD Special, Emergency only.

Candidate selection is limited to CRs in the loaded queue (up to 101 request
rows), not all DB patients. API 04 also describes a future full-census search
contract, but legacy pickers do not call it. Continue permits configuration,
not financial posting or proof of live backend eligibility.

## Tariff popup

In ordinary charge-entry screens, focus the add-tariff input and press Enter
while blank to open Select tariffs. API 05 supplies ten eligible catalogue
rows per page, searchable by code/name. Select across pages and Add selected.
Normal typed suggestions also use that API. Refund/Estimation add controls
remain hidden; account/settlement pages retain their existing layouts.

The actual Direct catalogue URL/sample is still required if it differs
from the documented target REST path. The supplied legacy request
`tariffdetails?reqNo=...` only supplies raised lines, not all addable tariffs.
No fixture catalogue fallback exists. Catalogue/financial eligibility
availability remains unverified.

## Request badge

Request-Based Collection displays the worklist's filtered `total`, including
search, hospital service, and request-type filters. Count all matches, not
only the ten visible request rows.

## Implementation references

- `src/services/legacyHbimsDirectPatients.js`: pending CR deduplication,
  paging, phone hydration/cache, ten-request concurrency limit.
- `src/services/applicationRuntime.js`: local sources/configuration gate.
- `src/utilities/sessionService.js`: backend/session/endpoint configuration.
- `src/features/cashCollection/Collection/Direct/direct.js`: admission rules.
- `src/features/cashCollection/Collection/Direct/Direct.jsx`: patient UI and
  Continue validation.
- `src/features/cashCollection/Collection/RequestBased/RequestBased.jsx`:
  filtered-total reporting.
- `src/features/cashCollection/CollectionDetails/BillingDetails/TariffPicker.jsx`:
  paginated catalogue dialog.
- `src/features/cashCollection/services/cashCollectionApi.js`: target REST
  paging transport and response validation.
