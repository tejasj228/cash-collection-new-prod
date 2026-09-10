# Transaction tables API

The Overview **Recent Transactions** table and the **Shift Dashboard** breakdowns / cross-filters use the same transaction row shape.

Every property in a transaction row is a JSON string, matching a database `character varying` result:

```json
{
  "no": "REC-2026-088241",
  "patient": "Example Patient",
  "cr": "939112600000001",
  "dateIso": "2026-09-09",
  "time": "10:38 AM",
  "mode": "Cash",
  "amount": "4280.00",
  "status": "Completed",
  "department": "General Medicine",
  "category": "General"
}
```

- Do not return JSON numbers for any row property, including `amount`, `cr`, or `no`.
- `dateIso` remains a string using `YYYY-MM-DD`, and `amount` excludes the currency symbol.
- `status` is one of `Completed`, `Refunded`, `Cancelled`.
- `department` is the raising department of the patient; `category` is the patient category (e.g. `General`, `General — CGHS`). The dashboard groups collections by, and cross-filters on, these two fields. A view exposing snake_case names (`department_name`, `pat_category`) is also accepted by the frontend mapper.

The same row contract applies to initial `recentTransactions` returned by `/bootstrap` and paged `items` returned by `GET /transactions`. Pagination metadata such as `total`, `page`, and `size` remains numeric.

The frontend derives temporary numeric amounts only when calculating totals or sorting; the received API row remains string-based.
