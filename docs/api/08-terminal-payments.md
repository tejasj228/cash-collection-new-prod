# POS terminal payments

Powers the Card/UPI flow on **Payment Details**: send to terminal, poll
status every 10 seconds for up to 5 minutes, auto-open the confirm dialog on
approval.

## 1. Initiate

```http
POST /api/cash-collection/terminal-payments
```

### Request body

| Field         | Type             | Notes                                                                                            |
| ------------- | ---------------- | ------------------------------------------------------------------------------------------------ |
| `paymentMode` | string           | `"Card"` \| `"UPI"`.                                                                             |
| `cardType`    | string, nullable | `"Debit Card"` \| `"Credit Card"` — only for `Card`.                                             |
| `terminalId`  | string           | Must be one of the counter's `posTerminals` — verify server-side, don't trust the client's list. |
| `amount`      | number           | Must be `> 0`.                                                                                   |
| `patientId`   | string           |                                                                                                  |
| `description` | string, optional | Free-text operator note, max 500 chars.                                                          |

```json
{
  "paymentMode": "Card",
  "cardType": "Debit Card",
  "terminalId": "T1",
  "amount": 480.0,
  "patientId": "4",
  "description": ""
}
```

### Response — must return immediately, never block waiting for the terminal

| Field                   | Type    | Notes                                                                                                                          |
| ----------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `terminalTransactionId` | string  | Server-owned opaque ID.                                                                                                        |
| `status`                | string  | `"PENDING"`.                                                                                                                   |
| `pollAfterMs`           | integer | `10000`. The frontend's poll interval — send this rather than hard-coding 10s on both sides.                                   |
| `expiresInSeconds`      | integer | `300`. The frontend's countdown timer authority — the **server's** expiry is still what matters; the browser timer is UX only. |

```json
{
  "success": true,
  "requestId": "trace-701",
  "data": {
    "terminalTransactionId": "POS-2026-000042",
    "status": "PENDING",
    "pollAfterMs": 10000,
    "expiresInSeconds": 300
  }
}
```

## 2. Poll status

```http
GET /api/cash-collection/terminal-payments/{terminalTransactionId}
```

Called every `pollAfterMs` until a terminal status is reached or the 5
minutes expire.

| Field                   | Type             | Notes                                                                                      |
| ----------------------- | ---------------- | ------------------------------------------------------------------------------------------ |
| `terminalTransactionId` | string           | Echoed back.                                                                               |
| `status`                | string           | `"PENDING"` \| `"APPROVED"` \| `"DECLINED"` \| `"FAILED"` \| `"CANCELLED"` \| `"EXPIRED"`. |
| `approvalCode`          | string           | Only on `APPROVED`.                                                                        |
| `cardLastFour`          | string, nullable | Only on `APPROVED`, only for Card. **Never** the full card number.                         |

```json
{
  "success": true,
  "requestId": "trace-702",
  "data": {
    "terminalTransactionId": "POS-2026-000042",
    "status": "APPROVED",
    "approvalCode": "024-088501",
    "cardLastFour": "4821"
  }
}
```

On `DECLINED` / `FAILED` / `CANCELLED` / `EXPIRED`, include a `message` the
UI can show directly — the frontend then enables the manual-fallback pencil
icon. Never log or return a CVV, PIN, full PAN, or raw provider secret.

Guard against a browser retry double-posting a successful charge: key
idempotency on the provider transaction ID **and** the posting request's
`Idempotency-Key` (see [`POST /transactions`](./09-post-transaction.md)).
