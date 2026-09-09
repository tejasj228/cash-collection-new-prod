# HBIMS integration guide

For the complete backend contract, counter/session rules, payloads, implementation sequence, and acceptance matrix, read [`HBIMS-BACKEND-IMPLEMENTATION.md`](./HBIMS-BACKEND-IMPLEMENTATION.md).

## Verified current HBIMS path

The active legacy flow was checked in `C:\Office_Workspace\HBIMS`:

1. The billing Struts module maps `/transactions/CashCollectionOfflineTransBSCNT` to `billing.transactions.CashCollectionOfflineTransBSCNT`.
2. The action uses the `hmode` request parameter for dispatch.
3. Its `cashcollection` forward renders `/transactions/cashcollection_offline_billtransNew.jsp`.
4. The JSP submits to `/transactions/CashCollectionOfflineTransBSCNT` and loads `billing/js/cashcollection_offline_transBS.js`.
5. The existing write modes are `OFFRECSER` for service receipt, `OFFREFUNDSER` for service refund, and `OFFESTIMATION` for estimation. Each controller method validates the request token and fills hospital, seat, IP, and user-level data from the server session before calling the existing DATA layer.

This frontend does not duplicate that server-side behavior. Session-derived values must remain on the server.

## Prepared frontend boundary

`npm run build:hbims` produces two files in `dist-hbims`:

- `cash-collection.js`: an IIFE bundle exposed as `window.HBIMSCashCollection`.
- `cash-collection.css`: styles scoped below `.hbims-cash-collection` so the redesign does not reset the existing JSP page.

The bundle exposes:

```js
HBIMSCashCollection.mount(elementOrSelector, options);
HBIMSCashCollection.mountFromServices(elementOrSelector, options);
HBIMSCashCollection.unmount(elementOrSelector);
HBIMSCashCollection.createIntegrationContext(options);
HBIMSCashCollection.HBIMS_REQUEST_MODES;
```

The standard Vite build still works independently for design review.

## Suggested JSP mount

Copy the two generated files into a stable HBIMS static directory such as:

```text
HBIMS/WebContent/billing/cash-collection-redesign/
```

Then add a dedicated JSP or replace the body of the existing JSP only after its hidden form fields and controller responses have been mapped. A minimal mount is available at `integration/hbims/cash-collection-mount.jsp.example`.

The mount receives only browser-safe page configuration. Do not put `HOSPITAL_CODE`, `SEATID`, `IP_ADDR`, permissions, database identifiers, or trusted amounts into JavaScript and treat them as authoritative.

## Backend adapter contract to implement later

The HBIMS entry requires injected methods under `integration.services`. Keep these method names and return normalized JSON rather than legacy HTML fragments:

| Method                              | Purpose                                                                                | Minimum response                                                             |
| ----------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `loadBootstrap()`                   | initial business date, facility, services, first queue/report data and payment options | normalized model validated by `dataContract.js`                              |
| `searchPatients(query)`             | CR, IPD, mobile, or name search                                                        | patient identity and active visit/account summary                            |
| `listPendingRequests(filters)`      | request worklist and overview                                                          | request identity, type, patient, amount, department, raised time             |
| `getRequest(requestId)`             | open a request-based collection                                                        | request header plus charge lines                                             |
| `getTariffs(filters)`               | direct collection tariff search                                                        | tariff code, name, group, rate and allowed quantity rules                    |
| `getPaymentOptions(context)`        | allowed payment modes and POS terminals                                                | modes, restrictions and terminal identifiers                                 |
| `initiateTerminalPayment(command)`  | Starts Card/UPI terminal authorization                                                 | pending terminal transaction ID, 10-second poll interval and 5-minute expiry |
| `getTerminalPaymentStatus(command)` | Polls an initiated Card/UPI payment                                                    | pending, approved, declined, failed, cancelled or expired status             |
| `postTransaction(command)`          | receipt, refund, or estimate submission                                                | authoritative document number, status and printable data                     |
| `listTransactions(filters)`         | reports and recent transactions                                                        | paged transaction rows and server-calculated totals                          |

All writes must continue through the HBIMS controller/DATA/BO/DAO path and its database procedures. The browser payload is a command request; the server must recalculate totals, recheck permissions and request state, apply duplicate-entry protection, and choose the correct `hmode`.

## Normalized transaction event

The standalone review build uses `src/prototypeServices.js`. In HBIMS, a host may observe a successful server-backed confirmation through:

```js
HBIMSCashCollection.mountFromServices("#cash-collection-root", {
  services: window.hbimsCashCollectionServices,
  events: {
    onTransactionConfirmed(transaction) {
      console.log(transaction);
    },
  },
});
```

The event fires after `postTransaction()` returns an authoritative document number. It contains source, request identity, request/billing/service selection, patient references, selected charge lines, total, payment summary, and the server response.

## Implementation order

1. Add read-only JSON controller modes for patient lookup, request lists/details, tariff search, payment options, and reports.
2. Implement the HBIMS service adapter and load the initial normalized model through `loadBootstrap()`.
3. Add one server-side transaction command that maps to the existing receipt/refund/estimate paths. Preserve token checks and session-derived fields.
4. Return authoritative receipt/estimate data, then print only after a successful server response.
5. Characterize legacy totals and transaction behavior against the existing JSP before switching the menu route.
6. Publish the generated assets into the exploded WAR through the project’s deployment process and verify the deployed files, because source and deployed WAR content can drift.

## Deliberately not implemented

- No API URLs beyond the verified existing Struts action are invented.
- No HBIMS backend calls or mocked successful HTTP writes are present in the HBIMS entry.
- No HBIMS Java, JSP, JavaScript, Struts XML, form bean, or database file is modified.
- Standalone reports and overview totals remain fixture-derived; the HBIMS entry requires injected data and services.
