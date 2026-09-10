# Dashboard and end-shift backend contract

This frontend is prepared for a Spring Boot adapter that sits between React and legacy HBIMS. React must never connect to PostgreSQL or call an HBIMS package directly. The backend obtains hospital code, seat/user, counter, permissions, business date and IP context from the authenticated HBIMS session.

## Dashboard

`GET /api/cash-collection/dashboard?date=YYYY-MM-DD` returns one counter-scoped snapshot. Optional `paymentMode`, `status`, `hour`, `category`, `group` and `requestType` values represent the linked dashboard filters.

The server must calculate all monetary KPIs and breakdowns from the same frozen query scope. `cashInDrawer` is the business-day net for cash payments only: completed cash collections minus cash refunds. It remains unchanged when chart filters change and must equal the amount used for end-shift reconciliation. Return aggregated buckets and a paged recent-transaction result; do not send 10,000 transaction rows merely to calculate charts in the browser.

The exact response is specified by `DashboardSnapshot` in `contracts/openapi.yaml`. Amounts, counts and percentages are display strings in the response. IDs and versions remain opaque.

## End-shift sequence

1. `GET /shifts/current/close-preparation` resolves the active shift from the authenticated session and performs no write.
2. The backend re-reads the legacy cash amount, checks day-end permission and reports any blockers. It returns an opaque `shiftId`, concurrency `version`, expected cash, and the enabled denomination list.
3. React submits only the version and `{code, quantity}` rows to `POST /shifts/{shiftId}/close`, with an `Idempotency-Key` header.
4. The backend resolves denomination values again, recalculates the counted total, locks/rechecks the shift, re-reads expected cash and blockers, and rejects stale or mismatched data.
5. In one transaction, the adapter invokes the verified legacy day-end write and commits its idempotency record. A retry returns the original closed result.

The preparation response separates `previousSubmittedCash`, the current segment's `expectedCash`, and `cumulativeExpectedCash`. With an earlier ₹1,000 close and ₹100 collected after reopening, React reconciles ₹100 while Spring submits the cumulative ₹1,100 day value to the legacy adapter. Spring must also merge prior and current denomination quantities before any legacy call that overwrites the day's denomination detail.

After a successful close, React changes the navbar action to **Start Shift**. `POST /shifts/{shiftId}/reopen` starts another segment only for the same authenticated counter and business date. The endpoint uses the closed version plus an idempotency key, preserves prior submitted values, and returns a new open segment/version. Concurrent reopen attempts must produce only one segment.

When the operator enables **Skip manual note and coin count**, React sends `reconciliationMode: SKIPPED` with no quantities. The backend still rechecks the authoritative current-segment and cumulative cash amounts and records that denomination reconciliation was skipped. With `DENOMINATION`, the backend resolves every denomination value by code and requires the current segment count to equal current segment cash.

Do not accept hospital code, seat ID, counter ID, expected cash, denomination values, calculated total, day-end mode or summary number as trusted command fields from the browser.

Recommended conflicts are `COUNTER_NOT_OPEN`, `SHIFT_ALREADY_OPEN`, `SHIFT_ALREADY_CLOSED`, `SHIFT_CHANGED`, `CASH_MISMATCH`, `PENDING_TRANSACTIONS`, `TERMINAL_PAYMENT_PENDING`, `DAY_END_NOT_ALLOWED`, and `DUPLICATE_REQUEST_IN_PROGRESS`.

## Verified legacy mapping

The checked legacy source reads cash through `PKG_BILL_VIEW.proc_dayened_cash_amount_dtls` with mode `1`, then validates the denomination total in `WebContent/billing/js/DayEndTrans.js`. The write path is `DayEndTransDATA` → `DayEndTransBO` → `DayEndTransDAO.insertAddDataProc` → `Pkg_Bill_Dml.DML_DAYEND_DTL`.

The 35-position legacy call includes hospital, generated summary number, session, date range, seat/counter, module/user/day-end modes, authoritative cash, counter/user/IP labels, note quantities, coin quantities and credit amount. The new Spring service should encapsulate this in a purpose-specific adapter instead of exposing the large form bean to JSON.

## Remaining database verification

pgAdmin registers `AIIMS_NEW` at `10.226.80.35:5445` with database user `aiimsnew`. Its password is encrypted in pgAdmin storage and was not extracted. Run the following read-only catalog query in the already connected `aiimsnew` Query Tool and return the result before backend implementation. It neither invokes the packages nor changes data.

```sql
BEGIN READ ONLY;

SELECT current_database() AS database_name,
       current_user AS database_user,
       current_setting('transaction_read_only') AS read_only;

SELECT n.nspname AS schema_name,
       p.proname AS routine_name,
       pg_get_function_arguments(p.oid) AS arguments,
       p.prorettype::regtype::text AS return_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE lower(p.proname) IN (
  'proc_dayened_cash_amount_dtls',
  'dml_dayend_dtl',
  'proc_check_dayend_allowed',
  'proc_hblt_payment_detail',
  'proc_get_counter_user'
)
ORDER BY n.nspname, p.proname;

SELECT table_schema, table_name, column_name, data_type, ordinal_position
FROM information_schema.columns
WHERE lower(table_name) LIKE ANY (ARRAY[
  '%dayend%', '%day_end%', '%cash_handover%', '%denomination%'
])
ORDER BY table_schema, table_name, ordinal_position;

ROLLBACK;
```

Before enabling the write endpoint, compare the live signatures and table effects with the DAO parameter order, then test transaction rollback, duplicate submission, stale version, two users closing the same counter, pending POS activity and exact cash reconciliation.
