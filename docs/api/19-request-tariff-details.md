# Tariff tile — current-code contract and rules

This is the single reference for OPD/IPD tariff and settlement rendering.
It describes the checked-in code, not a proposed endpoint. No frontend,
validation, eligibility, or payment logic is changed by this document.

## API-driven behaviour

The backend supplies the patient/request, service and billing-workflow options,
eligibility result, tariff data, and workflow context. The frontend chooses
among its existing pages using those API-supplied identifiers and values;
it does not invent the patient's tariffs, account state, or eligibility.
The request's hospital service and request type resolve the service/workflow,
and the selected workflow family determines ordinary tariff entry versus
account payment versus settlement. Only applicable fields are rendered.

For example, an ordinary OPD service uses the ordinary tariff table; an IPD
account payment uses account fields and amount; an IPD Final Adjustment
request uses settlement context and grouped tariffs with the details popup.
The backend must return a supported workflow family and authoritative data.
The frontend is not a generic renderer for arbitrary page definitions.

## Data loading

There is **no** `/requests/{req_no}/tariff-details` call in the current code.
The existing target REST adapter consumes:

| Purpose                                    | API/data source                              | Fields                                                                                              |
| ------------------------------------------ | -------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Request lines and linked patient           | `GET /api/cash-collection/requests/{req_no}` | `tariff_lines`, `linked_patient`                                                                    |
| Eligibility and account/settlement context | `POST /api/cash-collection/eligibility`      | `is_eligible`, `eligibility_code`, `eligibility_message`, `pat_context_version`, `workflow_context` |
| Ordinary addable tariff catalogue          | Bootstrap                                    | `tariff_catalog`, `tariff_group_names`                                                              |
| Catalogue API contract                     | `GET /api/cash-collection/tariffs`           | Available in service adapter; the tile itself filters bootstrap catalogue locally                   |

`openRequestFlow` loads request detail, resolves the linked patient and
workflow, and checks eligibility before opening the workspace. Direct setup
also gates Continue on eligibility success. Errors and missing patient data
prevent continuation.

**Local legacy integration differs:** `applicationRuntime.js` loads
`pendinglist` and independently calls `patinfo` by CR number. Known live
requests receive a temporary eligibility pass-through with empty context.
No live tariffs are fetched by that staged path. This is an integration gap,
not a reason to use dummy tariffs for live requests. API 18 documents that
separate patient tile. The target REST adapter currently still expects
`linked_patient`; it does not call the proposed REST patient-tile path.

## Shared flat tariff line

```json
{
  "tariff_code": "BED-2041",
  "tariff_name": "General ward bed charge / day",
  "tariff_group_name": "Accommodation",
  "tariff_rate": 1200,
  "tariff_qty": 6,
  "tariff_discount_percent": 0
}
```

The mapper converts these to `code`, `name`, `group`, `rate`, `qty`, and
`discount`. Rate/quantity/discount are numbers in the current line schema.
Do not use `quantity`, nested `details`, pre-grouped summaries, or scalar
settlement fields: the existing UI does not consume those shapes. The backend
must supply valid finite values; the mapper does not comprehensively validate
malformed line data.

Workspace line initialization follows this exact order:

1. Nonempty `request.lines` wins for every workflow.
2. A non-account workflow otherwise starts empty.
3. Account workflows otherwise use nonempty `workflowContext.chargeBreakdown`.
4. Settlement workflows otherwise stay empty, without inventing charges.
5. Other account workflows initialize one Account line from `payableAmount`
   or zero, quantity 1, discount 0, and the workflow label.

Loaded lines are initially selected and marked request-source. Manual-line
delete controls cannot remove them.

## Eligibility context: exact fields

These are read from eligibility's `workflow_context`, **not** a separate
`settlement_context` response:

| Wire field                 | Internal field       | Display/use                       |
| -------------------------- | -------------------- | --------------------------------- |
| `raising_department_names` | `raisingDepartments` | Department                        |
| `episode_names`            | `episodes`           | Episode                           |
| `patient_category_names`   | `patientCategories`  | Patient Category                  |
| `room_type_names`          | `roomTypes`          | Ward Type                         |
| `ward_names`               | `wards`              | Ward Name                         |
| `payment_payable_amount`   | `payableAmount`      | Initial account amount            |
| `tariff_charge_breakdown`  | `chargeBreakdown`    | Fallback account/settlement lines |

The five name fields are arrays; `firstContextValue` uses the first value
with patient data as fallback. Context values are displayed read-only.

```json
{
  "success": true,
  "trace_id": "trace-settlement-1",
  "data": {
    "is_eligible": true,
    "eligibility_code": "ELIGIBLE",
    "pat_context_version": "opaque-version",
    "workflow_context": {
      "raising_department_names": ["General Medicine"],
      "episode_names": ["03-Sep-2026 / IPD"],
      "patient_category_names": ["General"],
      "room_type_names": ["General ward"],
      "ward_names": ["Ward 4B"],
      "payment_payable_amount": null,
      "tariff_charge_breakdown": [
        {
          "tariff_code": "BED-2041",
          "tariff_name": "General ward bed charge / day",
          "tariff_group_name": "Accommodation",
          "tariff_rate": 1200,
          "tariff_qty": 6,
          "tariff_discount_percent": 0
        }
      ]
    }
  }
}
```

## Rendering by workflow

The primary branch is `workflow.uiFamily`, not hospital service alone.

| Workflow/case                                                                   | Existing rendering                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tariff-entry`, `service-refund`, `package-entry`, `package-refund`             | Ordinary `ChargeBuilder`: checkbox, serial number, tariff name, rate/unit, editable qty, editable discount %, calculated amount. No account-context boxes. Covers ordinary OPD/Emergency and applicable IPD workflows. |
| `account-payment`, `advance-refund`, `part-payment-refund`                      | Account builder: read-only Department, Episode, Patient Category and editable amount. No tariff table or Ward Type/Ward Name.                                                                                          |
| `bill-settlement`, `bill-settlement-refund`                                     | All five read-only context fields, tariff table, and read-only derived settlement total.                                                                                                                               |
| Request mode + request Hospital Service `IPD` + Request Type `Final Adjustment` | Details callback enabled. Settlement table groups flat lines by group, with Particulars / Discount Amt / Net Amt / Details columns. Missing group becomes `Other`.                                                     |
| Other settlement cases                                                          | Flat read-only Tariff Name / Rate / Qty / Discount % / Amount table, without grouped popup.                                                                                                                            |

Thus the five fields are not ordinary OPD tariff fields, and they are not
shown for every IPD workflow. Three also appear in non-settlement account
forms. The special popup condition is narrower than simply IPD settlement.

### Final Adjustment popup

The popup receives already-loaded lines for the selected group: no additional
API call. Columns: serial number, Req No., Req Date, Department, Tariff Name,
Qty, Actual Amt, Exemption (Pkg/Disc), Net Amt, Payment Mode, Mode.
Request number/date come from the request; department uses initialized
context/patient fallback. Payment mode is the current selection, initialized
to the first bootstrap mode (not necessarily a dash). Mode is Offline for
Cash, Online for another nonempty selection, otherwise a dash. These are
current UI values, not evidence of a previously posted receipt.

## Editing and calculations

- Display gross = `Number(rate) * Number(qty || 0)`.
- Discount is clamped to 0–100%; discount amount = gross × percent / 100.
- Net = `max(0, gross - discount)`. Totals use selected lines only.
- Final Adjustment summary rows sum these same discount/net values by group.
- Quantity input accepts at most three digits with minimum 1; discount input
  is sanitized and clamped to 0–100. Only manual lines can be removed.
- Adding an existing manual tariff increments its quantity. Local catalogue
  search filters by group and code/name, returning up to six matches.
- Search/add controls are hidden for Refund and Estimation; existing ordinary
  rows remain editable/selectable.
- Ordinary Proceed requires a positive total except Estimation Continue.
  Account Proceed always requires a positive total. Non-settlement account
  amount input is sanitized and clamped at zero; settlement total is read-only.

These are browser display/input controls, not replacements for backend price,
refund-limit, tariff eligibility, or authorization validation.

## Eligibility and posting: unchanged rules

The reference implementation in `mocks/prototypeServices.js` checks patient
existence, allowed workflow, and whether the legacy route is implemented.
Request checks then validate queue presence, patient CR, and receipt/refund
classification. Direct-only checks validate charge-type eligibility,
admitted IPD status, account-open/account-not-open rules, and refundable
document availability. Request flows do not run these direct-only checks.
These reference checks are not proof of deployed backend enforcement: the
staged live request path still uses the pass-through described above.

Direct Continue needs a selected patient/workflow and is disabled during the
eligibility check. Payment UI applies category-based mode restrictions,
positive-total checks, Cheque description requirements, and terminal
approval/manual fallback controls.

Posting returns CR number (no `pat_id`), request ID/version, patient-context
version, workflow IDs/initialized context, selected lines, displayed total,
payment details, and idempotency key. Backend revalidation remains mandatory.
Printing requires an authoritative document number, complete printable
patient/lines/payment/totals, and a finite authoritative net amount. Browser
sums are display calculations; printed values use the posting response.

## Source traceability

| File                                                                              | Relevant responsibility                                      |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `src/features/cashCollection/services/cashCollectionApi.js`                       | Existing API calls; no standalone tariff-details route       |
| `src/features/cashCollection/services/apiWireMappers.js`                          | Request/eligibility/tariff mapping                           |
| `src/features/cashCollection/CashCollection/CashCollection.jsx`                   | Request loading, workflow routing, eligibility gate          |
| `src/features/cashCollection/Collection/Direct/Direct.jsx`                        | Direct eligibility gate                                      |
| `src/features/cashCollection/CollectionDetails/CollectionDetails.jsx`             | Initialization precedence, context, popup condition, posting |
| `src/features/cashCollection/CollectionDetails/BillingDetails/BillingDetails.jsx` | Tables, editing, grouping, popup                             |
| `src/features/cashCollection/model/chargeCalculations.js`                         | Display arithmetic                                           |
| `src/mocks/prototypeServices.js`                                                  | Reference eligibility checks                                 |
| `src/services/applicationRuntime.js`                                              | Staged legacy reads/pass-through                             |

API 03 (request transport), API 05 (catalogue), API 07 (eligibility), and API
09 (posting) are distinct APIs, not duplicate tile documents. This document
replaces the incorrect standalone tariff-details proposal.
