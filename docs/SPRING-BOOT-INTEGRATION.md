# Spring Boot integration

The frontend contract is defined in `contracts/openapi.yaml`. Generate Spring interfaces or implement those operations directly under a dedicated cash-collection module.

## Suggested backend packages

```text
in.cdac.billing.cashcollection/
  config/          security, Jackson, persistence and external adapter wiring
  controller/      REST controllers only
  dto/             request and response records matching OpenAPI
  service/         eligibility, pricing, posting and query orchestration
  repository/      Spring JDBC/JPA access to the new service database
  domain/          transaction, request, payment and workflow rules
  integration/
    hbims/          anti-corruption adapter for legacy procedures and schemas
    pos/            terminal initiation, enquiry and reconciliation
  validation/      cross-field and workflow validators
  exception/       stable error codes and envelope mapping
```

## Security and counter scope

Resolve `userId`, `seatId`, `hospitalCode`, counter and permissions from the authenticated session or trusted gateway claims. Apply that scope inside every query. Ignore any browser value that tries to select a different counter, hospital or permission set.

Use the same scope for `/bootstrap`, request pages, patient search, reports, posting and reprints. Add indexes for the pending-request predicates and sort keys used by `/requests`; return only the requested page and an indexed count or an appropriate cached count.

## Financial posting

`POST /transactions` must run as a single server transaction:

1. Claim the `Idempotency-Key` for the authenticated counter.
2. Lock or version-check the request and patient billing context.
3. Re-run eligibility and payment-mode rules.
4. Reload tariffs, quantities allowed, discounts allowed and payable balances.
5. Recalculate gross, discount and net with decimal arithmetic.
6. Verify a Card/UPI approval belongs to this counter, terminal, amount and unposted transaction.
7. Call the mapped HBIMS adapter/procedure and inspect all OUT values.
8. Persist the audit event and immutable printable snapshot.
9. Mark the request processed and commit.
10. Return the authoritative document number, totals and printable data.

A replay of the same idempotency key returns the original result. A different command using the same key returns `409 IDEMPOTENCY_CONFLICT`.

## POS lifecycle

`POST /terminal-payments` creates a server-side attempt with a five-minute expiry. The frontend polls its opaque ID every ten seconds. Spring Boot should query the provider or its locally reconciled state and return `PENDING`, `APPROVED`, `DECLINED`, `FAILED`, `CANCELLED`, or `EXPIRED`. Provider credentials and approval verification stay on the server. The five-second auto-approval behavior exists only in the development mock adapter.

## Legacy HBIMS adapter

Keep legacy table names, procedure parameters, mode codes and datasource details inside `integration/hbims`. Map legacy rows into the OpenAPI DTOs rather than exposing database-shaped responses to React. Confirm procedure bodies, OUT parameters and transaction behavior before enabling a write route. Any unresolved legacy path should return a stable unavailable-workflow error and must not silently simulate success.

## Error envelope

Return errors consistently:

```json
{
  "success": false,
  "requestId": "trace-id",
  "error": {
    "code": "PATIENT_NOT_ADMITTED",
    "message": "The patient must have a current admitted IPD episode.",
    "fieldErrors": {}
  }
}
```

Recommended status mapping: `400` malformed input, `401/403` session or permission failure, `404` missing resource, `409` stale/already-processed/idempotency conflict, `422` ineligible workflow, and `503` unavailable HBIMS or POS dependency.
