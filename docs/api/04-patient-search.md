# Direct Collection patient search

## Current local source: loaded pending requests

Local legacy mode does **not** call the target REST patient-search endpoint
below. It builds candidates from the live `pendinglist`, deduplicates by CR,
and sorts by latest pending-request date with CR as tie-breaker. CRs with any
IPD request form the IPD list; remaining CRs form the shared OPD Normal/OPD
Special/Emergency list. This is not the full census or current-admission proof.

Each visible page enriches only ten candidates through `patinfo`, providing
phone and header data. Name search uses pending names. Phone/mixed numeric
searches hydrate candidates in batches of at most ten and cache successful
reads, so phone matches outside the visible page are found. Only the loaded
pending population is searched (currently up to 101 requests). Phone search
may require more than ten total detail reads; at most ten are in flight.
Exact CR revalidation refreshes its detail instead of trusting cached status.

Missing admission status is permitted only for classified pending candidates,
using request service as temporary fallback. When `patinfo` explicitly
supplies `is_admitted` or recognized `admission_status`, current admission
validation takes precedence. Historical `adm_no` is not admission proof.
Local Continue validates candidate CR/service/workflow for tariff
configuration, not backend financial eligibility. Posting still requires
authoritative rules.

## Future full-DB search contract

```http
GET /api/cash-collection/patients?pat_search=Patient%2C987654&hospital_service_id=opd-normal&admitted_only=false&page=0&size=10
```

Used by Existing Patients and exact CR lookup for OPD Normal, OPD Special,
Emergency, and IPD. This is a database read, not a filter over bootstrap
patients or `pendinglist`. The compact pending-request patient tile is a
different API documented in API 18.

## Inputs

| Parameter             | Rule                                                                                                                                                              |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pat_search`          | Empty lists recent patients; otherwise search name, phone, or CR. Comma-separated details must match the same patient.                                            |
| `hospital_service_id` | `opd-normal`, `opd-special`, `emergency`, or `ipd`.                                                                                                               |
| `admitted_only`       | `true` for IPD: currently admitted only. `false` for all other services: non-admitted only, not all patients.                                                     |
| `exact_cr`            | `true` for Find Patient and Continue revalidation: exact `pat_search` CR match, not substring.                                                                    |
| `page`                | Zero-based; increments on paging and resets on search changes.                                                                                                    |
| `size`                | 10. Never return/download the full patient census.                                                                                                                |
| `admission_sort`      | UI sends `admitted_on,desc`; backend resolves admitted rows by latest admission and non-admitted rows by latest visit/registration. Add CR as stable tie-breaker. |

Apply admission and search filters **before** SQL pagination. The total is
the full matching count, not the number of records on this page. Scope all
reads to the authenticated hospital/user. Search the full matching DB set.

## Response

```json
{
  "success": true,
  "trace_id": "trace-patients-1",
  "data": {
    "items": [
      {
        "cr_num": "379132000151071",
        "pat_name": "Example Patient",
        "pat_age": 40,
        "pat_sex": "Male",
        "mobile_num": "9876543210",
        "is_admitted": false,
        "admission_status": "Outpatient",
        "episode_name": "OPD / Medicine",
        "category_name": "General",
        "ipd_admission_num": "-",
        "eligible_charge_type_ids": ["1", "4", "3"],
        "ipd_account_open": false,
        "refundable_document_count": 0
      }
    ],
    "total": 21,
    "page": 0,
    "size": 10
  }
}
```

Use the OpenAPI `Patient` fields for the remaining patient/header/account
data. `is_admitted` must be a real JSON boolean representing current DB
state; do not infer it from a historical admission number. Compatibility
status labels accepted by the frontend are `Admitted` (true), and
`Not admitted`, `Discharged`, `Outpatient`, `Visited today`, `Registered`
(false), case-insensitive. Unknown status without the boolean blocks use.

## Validation flow

The picker checks admission partition on every returned row. Continue
re-queries the exact CR even for a selected patient, validates admission
state, and then calls API 07 eligibility with the current service/workflow.
A valid-looking 15-digit CR is not sufficient: it must resolve to an eligible
DB patient. Admitted patients cannot use either OPD option or Emergency;
non-admitted patients cannot use IPD. Eligibility still validates other
workflow/account/refund rules. Recheck current admission on eligibility and
posting in the backend to prevent races.

## Integration status

The UI uses `searchPatientPage`. Local legacy mode implements it over the
loaded pending list and `patinfo` as described above; it no longer calls the
unavailable target REST patient endpoint. Production REST mode uses the
future full-DB contract. There is no fixture patient fallback. Backend
financial eligibility and full-census REST availability remain unverified.
API 20 summarizes the current Direct picker workflow.
