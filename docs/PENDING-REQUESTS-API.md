# Pending Requests table API

`GET /api/cash-collection/requests?page=0&size=10`

Page numbering starts at zero. Return only the requested page and the total pending count for the authenticated user's authorized counter scope.

```json
{
  "success": true,
  "requestId": "trace-123",
  "data": {
    "items": [
      {
        "req_id": "REQ-100001",
        "req_date": "09/09/2026",
        "pat_name": "Example Patient",
        "department_name": "General Medicine",
        "cr_num": "939112600000001",
        "charge_type": "OPD Service",
        "amount": "480.00",
        "version": "1"
      }
    ],
    "total": 10250,
    "page": 0,
    "size": 10
  }
}
```

Every property inside a pending-request row is a JSON string, matching the database `character varying` result. Do not return JSON numbers for `amount`, `cr_num`, or `version`. `req_date` uses DD/MM/YYYY; a separate `dateIso` is not required for this table API. `amount` excludes the currency symbol. `version` is a backend-issued concurrency token, not a displayed column. The outer `requestId` is an API trace ID, not the row request number.

Any initial `requests` rows included in bootstrap use the same field names. The frontend API adapter maps these names to the existing workflow model. Request-detail, patient, and transaction APIs retain their separate contracts; their fields were not renamed by this table change.

See `PendingRequestRow` in `contracts/openapi.yaml` for the schema.
