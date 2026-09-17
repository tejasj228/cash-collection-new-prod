# Legacy payment-category mapping

`GET /cashcollectionreqbased/paymentcategorymapping` uses the shared ticket, User-Agent and mode parameters from `src/utilities/sessionService.js`.

| Parameter         | Mapping                                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| reqType           | Receipt: 1; Refund: 2 (same legacy operation IDs as pending requests)                                                        |
| patCategory       | Patient tile `patient_category_code`; required, no default category                                                          |
| patReceiptPaymode | Explicit context value when available; currently 0                                                                           |
| chargeId          | Explicit context value when available; currently 0 as supplied in the backend example, not inferred from hospital-service ID |

Response: `{ "status": "success", "data": [{ "paymode": "Cash", "paydtls": "1#Cash#0#0#0" }] }`.

The first two `paydtls` segments supply the mode ID and canonical label. Preserve the full string and do not invent meanings for the remaining flags. The UI only permits returned modes, retains existing category restrictions, and blocks posting while mapping is loading or failed. An empty successful list permits no payment. There is no fixture-mode fallback in the legacy integration. Mode ID and `paydtls` accompany the payment object; posting and terminal endpoints still require a real backend contract and are not made live by this read endpoint.

Find Patient opens a compact identifier dialog (Mobile Number, ABHA Number, ABHA Address) and performs an exact normalized identifier lookup only after Search. It hydrates pending-list candidates from patinfo in bounded batches; there is no initial patient listing. Existing Patients remains the separate paginated listing. A typed CR can still be resolved using Continue directly. After an authoritative posting response is printed, `afterprint` returns the workflow to the collection homepage. Browsers cannot confirm that a physical print succeeded; closing or cancelling the print dialog also emits this event.
