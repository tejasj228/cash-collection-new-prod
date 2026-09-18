# Bill payment configuration

Hospital payment-mode configuration may supply these optional fields per mode
in `payment_mode_details` (Spring adapter) or on each paymentcategorymapping row
(legacy adapter):

```json
{
  "received_amount_flag": 0,
  "print_note": {
    "title": "EXEMPTED",
    "hindi": "नोट: इस बिल का भुगतान माफ है। इसका भुगतान न करें।",
    "english": "NOTE: This bill is exempted. Do not pay it."
  }
}
```

`received_amount_flag: 0` prints zero as Amount Received, regardless of mode
name. `1` prints the received amount returned by the transaction, or the net
total when no distinct received amount is provided. Net Payable and charges
remain unchanged. This display configuration does not alter backend eligibility
or collection/posting calculations.

The posted transaction's `printable_data.payment_details` can supply the same
fields and `received_amount`. Transaction values override mode configuration.
`print_note: null` explicitly disables the note. Note text is rendered as text,
not HTML. Prototype defaults for Virtual Account and Exempted are centralized in
`src/features/cashCollection/Print/paymentPrintPolicy.js`; other modes may be
configured by the API without changing the bill component.

The CR barcode uses CODE128 and encodes the original digit string, preserving
leading zeros. Missing/non-numeric CR numbers do not render a barcode.

Printing uses A4 portrait with natural table pagination and repeated table
headings. Totals/signature occur after the final tariff; the computer-generated
footer is anchored at the document's bottom without extending beyond the page.
Browser-managed page numbers are
not hardcoded into the document. The website preview remains a scrollable
document; the print engine chooses page breaks.
