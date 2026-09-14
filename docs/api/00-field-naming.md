# API field naming

Every business value sent to or returned from Cash Collection uses a
lowercase, snake-case name with a meaningful prefix. This avoids ambiguous
fields such as `id`, `name`, `date`, `amount`, `status`, `type`, and `mode`.

Standard transport fields remain unprefixed because their meaning is defined
by the API protocol: `success`, `data`, `error`, `page`, `size`, `total`, and
`trace_id`.

| Domain                      | Prefix                                   | Examples                                                                             |
| --------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------ |
| Patient                     | `pat_`                                   | `pat_id`, `pat_name`, `pat_age`, `mobile_num`, `cr_num`                              |
| Pending request             | `req_`                                   | `req_id`, `req_date`, `req_amount`, `req_charge_type`, `req_version`                 |
| Tariff                      | `tariff_`                                | `tariff_code`, `tariff_name`, `tariff_rate`, `tariff_qty`                            |
| Transaction                 | `transaction_`                           | `transaction_no`, `transaction_amount`, `transaction_status`, `transaction_date_iso` |
| Payment                     | `payment_`                               | `payment_mode`, `payment_amount`, `payment_card_types`                               |
| Hospital or billing service | `hospital_service_` / `billing_service_` | `hospital_service_id`, `billing_service_name`                                        |
| Shift                       | `shift_`                                 | `shift_id`, `shift_version`, `shift_business_date`, `shift_status`                   |
| Denomination                | `denomination_`                          | `denomination_code`, `denomination_quantity`                                         |
| Dashboard                   | `dashboard_`                             | `dashboard_date`, `dashboard_generated_at`                                           |
| Terminal                    | `terminal_`                              | `terminal_transaction_id`, `terminal_poll_after_ms`                                  |

`department_name`, `category_name`, `charge_type_id`, `account_num`, and
`abha_num` are already domain-specific and remain as written. All values that
are identifiers, amounts, dates, statuses, and names are strings unless the
endpoint explicitly documents them as an integer, boolean, or decimal input.

The React app converts these wire-format fields to its existing view model in
[`apiWireMappers.js`](../../src/features/cashCollection/services/apiWireMappers.js).
Frontend components must not add fallback support for older unprefixed API
fields.
