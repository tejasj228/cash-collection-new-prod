# POS terminal payments

Powers the Card/UPI flow on **Payment Details**: send to terminal, poll
status every 10 seconds for up to 5 minutes, auto-open the confirm dialog on
approval.

## 1. Initiate

```http
POST /api/cash-collection/terminal-payments
```

### Request body

| Field                 | Type             | Notes                                                                                            |
| --------------------- | ---------------- | ------------------------------------------------------------------------------------------------ |
| `payment_mode`        | string           | `"Card"` \| `"UPI"`.                                                                             |
| `card_type`           | string, nullable | `"Debit Card"` \| `"Credit Card"` — only for `Card`.                                             |
| `pos_terminal_id`     | string           | Must be one of the counter's `posTerminals` — verify server-side, don't trust the client's list. |
| `payment_amount`      | number           | Must be `> 0`.                                                                                   |
| `pat_id`              | string           |                                                                                                  |
| `payment_description` | string, optional | Free-text operator note, max 500 chars.                                                          |

```json
{
  "payment_mode": "Card",
  "card_type": "Debit Card",
  "pos_terminal_id": "T1",
  "payment_amount": 480.0,
  "pat_id": "4",
  "payment_description": ""
}
```

### Response — must return immediately, never block waiting for the terminal

| Field                         | Type    | Notes                                                                                                                          |
| ----------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `terminal_transaction_id`     | string  | Server-owned opaque ID.                                                                                                        |
| `transaction_status`          | string  | `"PENDING"`.                                                                                                                   |
| `terminal_poll_after_ms`      | integer | `10000`. The frontend's poll interval — send this rather than hard-coding 10s on both sides.                                   |
| `terminal_expires_in_seconds` | integer | `300`. The frontend's countdown timer authority — the **server's** expiry is still what matters; the browser timer is UX only. |

```json
{
  "success": true,
  "trace_id": "trace-701",
  "data": {
    "terminal_transaction_id": "POS-2026-000042",
    "transaction_status": "PENDING",
    "terminal_poll_after_ms": 10000,
    "terminal_expires_in_seconds": 300
  }
}
```

## 2. Poll status

```http
GET /api/cash-collection/terminal-payments/{terminal_transaction_id}
```

Called every `terminal_poll_after_ms` until a terminal status is reached or the 5
minutes expire.

| Field                     | Type             | Notes                                                                                      |
| ------------------------- | ---------------- | ------------------------------------------------------------------------------------------ |
| `terminal_transaction_id` | string           | Echoed back.                                                                               |
| `transaction_status`      | string           | `"PENDING"` \| `"APPROVED"` \| `"DECLINED"` \| `"FAILED"` \| `"CANCELLED"` \| `"EXPIRED"`. |
| `payment_approval_code`   | string           | Only on `APPROVED`.                                                                        |
| `card_last_four`          | string, nullable | Only on `APPROVED`, only for Card. **Never** the full card number.                         |

```json
{
  "success": true,
  "trace_id": "trace-702",
  "data": {
    "terminal_transaction_id": "POS-2026-000042",
    "transaction_status": "APPROVED",
    "payment_approval_code": "024-088501",
    "card_last_four": "4821"
  }
}
```

On `DECLINED` / `FAILED` / `CANCELLED` / `EXPIRED`, include a `terminal_message` the
UI can show directly — the frontend then enables the manual-fallback pencil
icon. Never log or return a CVV, PIN, full PAN, or raw provider secret.

Guard against a browser retry double-posting a successful charge: key
idempotency on the provider transaction ID **and** the posting request's
`Idempotency-Key` (see [`POST /transactions`](./09-post-transaction.md)).
