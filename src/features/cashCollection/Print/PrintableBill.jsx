import React from "react";
import { createPortal } from "react-dom";
import "./BillDocument.css";
import "./PrintableBill.css";
import { PRINT_MEDIA } from "./printableBill";
import { useAppData } from "../../../app/providers/AppDataProvider";
import { getHospitalLogo } from "./hospitalLogoMapper/hospitalLogoMapper";
import { PatientBarcode } from "./PatientBarcode.jsx";
import {
  resolvePaymentPrintPolicy,
  receivedAmount,
} from "./paymentPrintPolicy";
import {
  displayDate,
  money,
  compactIdentifier,
} from "../../../shared/utils/formatters";
import {
  lineGross,
  lineDiscountAmount,
  lineNet,
} from "../model/chargeCalculations";

const DASH = "—";
const DEFAULT_FACILITY_NAME =
  "All India Institute of Medical Sciences, Mangalagiri";
const PLACEHOLDER_FACILITY_NAMES = new Set([
  "hbims hospital",
  "hbims cash collection",
]);
const present = (value) => {
  const text = String(value ?? "").trim();
  return text && text !== "-" ? text : DASH;
};
const formatClock = (date) =>
  date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

function documentMoment(value, fallbackDate) {
  const raw = String(value || "").trim();
  const parsed = raw ? new Date(raw) : null;
  if (parsed && !Number.isNaN(parsed.getTime()) && /T|\d:\d/.test(raw))
    return {
      date: displayDate(parsed.toISOString().slice(0, 10)),
      time: formatClock(parsed),
    };
  return { date: present(raw || fallbackDate), time: formatClock(new Date()) };
}

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];
const belowHundred = (value) =>
  value < 20
    ? ONES[value]
    : `${TENS[Math.floor(value / 10)]}${value % 10 ? ` ${ONES[value % 10]}` : ""}`;
function integerWords(value) {
  let remaining = Math.max(0, Math.floor(value));
  if (!remaining) return "Zero";
  const parts = [];
  [
    [10000000, "Crore"],
    [100000, "Lakh"],
    [1000, "Thousand"],
    [100, "Hundred"],
  ].forEach(([unit, label]) => {
    const count = Math.floor(remaining / unit);
    if (count) {
      parts.push(
        `${count < 100 ? belowHundred(count) : integerWords(count)} ${label}`,
      );
      remaining %= unit;
    }
  });
  if (remaining) parts.push(belowHundred(remaining));
  return parts.join(" ");
}
export function amountInWords(amount) {
  const numeric = Math.max(0, Number(amount) || 0);
  const rupees = Math.floor(numeric);
  const paise = Math.round((numeric - rupees) * 100);
  return `Rupees ${integerWords(rupees)}${paise ? ` and ${integerWords(paise)} Paise` : ""} Only`;
}

function Field({ label, value, strong = false, className = "" }) {
  return (
    <div className={`bill-field ${className}`.trim()}>
      <span>{label}</span>
      <strong className={strong ? "bill-emphasis" : undefined}>
        {present(value)}
      </strong>
    </div>
  );
}

export function paymentFacts(payment) {
  const structured =
    payment && typeof payment === "object"
      ? payment
      : { mode: payment, summary: payment };
  const manual = structured.manualDetails || {};
  const terminal = structured.terminalApproval || {};
  const mode = present(structured.mode);
  const cardLastFour = manual.cardLastFour || terminal.cardLastFour;
  return {
    mode,
    card: cardLastFour
      ? `${structured.cardType || manual.cardType || "Card"} ending ${cardLastFour}`
      : null,
    terminal: structured.terminalId,
    reference: manual.reference || terminal.terminalTransactionId,
    transactionDate: manual.transactionDate,
    status:
      terminal.status ||
      (manual.summary
        ? "Manual details recorded"
        : mode === "Cash"
          ? "Received"
          : "Completed"),
    details:
      String(manual.summary || "").trim() ||
      String(structured.description || "").trim() ||
      DASH,
    virtual: mode.toLowerCase().replace(/[^a-z]/g, "") === "virtualaccount",
  };
}

function PrintableBill({
  receiptNo,
  patient,
  lines,
  total,
  payment,
  requestType,
  documentDate,
  requestDate,
  hospitalService,
  billingService,
  raisingDepartment,
  cashier,
  preview = false,
}) {
  const { todayIso, facility = {}, paymentOptions = {} } = useAppData();
  const isRefund = requestType === "Refund";
  const isEstimate = requestType === "Estimation";
  const gross = lines.reduce((sum, line) => sum + lineGross(line), 0);
  const discount = lines.reduce(
    (sum, line) => sum + lineDiscountAmount(line),
    0,
  );
  const moment = documentMoment(documentDate, displayDate(todayIso));
  const pay = paymentFacts(payment);
  const structuredPayment =
    payment && typeof payment === "object" ? payment : { mode: payment };
  const policy = resolvePaymentPrintPolicy(
    structuredPayment,
    paymentOptions.modeDetails?.[pay.mode],
  );
  const paidAmount = isEstimate
    ? total
    : receivedAmount(structuredPayment, total, policy);
  const suppliedFacilityName = String(facility.name || "").trim();
  const facilityName = PLACEHOLDER_FACILITY_NAMES.has(
    suppliedFacilityName.toLowerCase(),
  )
    ? DEFAULT_FACILITY_NAME
    : suppliedFacilityName || DEFAULT_FACILITY_NAME;
  const facilityLogo = getHospitalLogo(facility.hospitalCode ?? "37913");
  const clean = (value) => (present(value) === DASH ? "" : present(value));
  const locationInfo = [
    clean(facility.city),
    clean(facility.state),
    clean(facility.pincode) && `PIN: ${clean(facility.pincode)}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const contactInfo = [
    clean(facility.phone) && `Phone: ${clean(facility.phone)}`,
    clean(facility.email),
    clean(facility.fax) && `Fax: ${clean(facility.fax)}`,
    clean(facility.contactPerson) &&
      `Contact: ${clean(facility.contactPerson)}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const codeInfo = [
    clean(facility.shortName),
    clean(facility.hospitalCode) &&
      `Hospital Code: ${clean(facility.hospitalCode)}`,
    clean(facility.stateCode) && `State Code: ${clean(facility.stateCode)}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const bill = (
    <article
      className={`${preview ? "bill-preview-sheet" : "print-bill"} aiims-bill`}
      data-media={PRINT_MEDIA}
    >
      <PatientBarcode cr={patient?.cr} />
      <header className="aiims-bill-head">
        <div className="aiims-bill-brand">
          {facilityLogo && (
            <img src={facilityLogo} alt={`${facilityName} logo`} />
          )}
          <div>
            <h1>{facilityName}</h1>
            {facility.subtitle && (
              <p className="aiims-bill-hindi">{facility.subtitle}</p>
            )}
            {facility.address && <p>{facility.address}</p>}
            {locationInfo && (
              <p className="bill-hospital-info">{locationInfo}</p>
            )}
            {contactInfo && <p className="bill-hospital-info">{contactInfo}</p>}
            {codeInfo && <p className="bill-hospital-info">{codeInfo}</p>}
          </div>
        </div>
      </header>
      <section className="bill-meta">
        <Field label="Hospital Service" value={hospitalService} />
        <Field label="Billing Service" value={billingService} />
        <Field
          label="Bill No."
          value={`${compactIdentifier(receiptNo) || DASH} / ${isRefund ? "1" : "0"}`}
        />
        <Field label="Request Date" value={requestDate} />
        <Field label="Cashier" value={cashier} />
        <Field
          label="Raising Department"
          value={raisingDepartment || patient?.department}
        />
        <Field label="Billed Date" value={moment.date} />
        <Field label="Billed Time" value={moment.time} />
      </section>
      <section className="bill-section">
        <div className="bill-patient-grid">
          <Field label="CR No." value={compactIdentifier(patient?.cr)} />
          <Field label="Patient Name" value={patient?.name} />
          <Field
            label="Age / Sex"
            value={`${present(patient?.age)} / ${present(patient?.sex)}`}
          />
          <Field label="Category" value={patient?.category} />
          <Field
            label="Mobile No."
            value={compactIdentifier(patient?.mobile)}
          />
          <Field label="ABHA No." value={patient?.abhaNumber} />
        </div>
      </section>
      <section className="bill-section bill-charges-section">
        <h2>Charges</h2>
        <table className="bill-charges">
          <thead>
            <tr>
              <th className="center">S. No.</th>
              <th>Code</th>
              <th>Procedure / Inv. / Service</th>
              <th>Tariff Group</th>
              <th className="right">Rate (₹)</th>
              <th className="center">Qty</th>
              <th className="right">Discount (₹)</th>
              <th className="right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={line.key || `${line.code}-${index}`}>
                <td className="center">{index + 1}</td>
                <td className="bill-code">{present(line.code)}</td>
                <td>
                  <strong>{present(line.name)}</strong>
                </td>
                <td>{present(line.group)}</td>
                <td className="right">{money(line.rate)}</td>
                <td className="center">{line.qty}</td>
                <td className="right">{money(lineDiscountAmount(line))}</td>
                <td className="right">{money(lineNet(line))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="bill-after-table">
          <div className="bill-words">
            <span>Amount in words</span>
            <strong>{amountInWords(total)}</strong>
          </div>
          <table className="bill-totals">
            <tbody>
              <tr>
                <td>Billed Amount</td>
                <td>₹ {money(gross)}</td>
              </tr>
              <tr>
                <td>Less: Discount</td>
                <td>
                  {discount > 0 ? "− " : ""}₹ {money(discount)}
                </td>
              </tr>
              <tr className="bill-net">
                <td>Net Payable</td>
                <td>₹ {money(total)}</td>
              </tr>
              <tr className="bill-paid">
                <td>
                  {isRefund
                    ? "Amount Refunded"
                    : isEstimate
                      ? "Estimated Amount"
                      : "Amount Received"}
                </td>
                <td>₹ {money(paidAmount)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      {!isEstimate && (
        <section className="bill-section">
          <h2>Payment</h2>
          <div className="bill-payment-grid">
            <Field label="Mode" value={pay.mode} />
            {pay.card && <Field label="Card" value={pay.card} />}
            {pay.terminal && (
              <Field label="POS Terminal" value={pay.terminal} />
            )}
            {pay.reference && (
              <Field
                label="Bank Reference / Transaction No."
                value={pay.reference}
              />
            )}
            {pay.transactionDate && (
              <Field label="Transaction Date" value={pay.transactionDate} />
            )}
            <Field label="Status" value={pay.status} />
            <Field
              label="Payment Details"
              value={pay.details}
              className="bill-payment-details"
            />
          </div>
          {policy.printNote && (
            <div className="virtual-payment-note">
              <span>
                PAYMENT DETAILS: {policy.printNote.title || pay.mode} — AMT.: ₹
                {money(total)}
              </span>
              <span lang="hi">{policy.printNote.hindi}</span>
              <span>{policy.printNote.english}</span>
            </div>
          )}
        </section>
      )}
      <footer className="aiims-bill-foot">
        <div className="bill-signature">
          <span />
          <strong>{present(cashier)}</strong>
          <small>Authorised Signatory</small>
        </div>
        <div className="bill-colophon">
          <span>This is a computer-generated receipt.</span>
          <span>
            Printed {moment.date} {moment.time}
          </span>
        </div>
      </footer>
    </article>
  );
  // Keep the printable page outside the application shell. The shell is much
  // taller than A4 and its print styles otherwise push this receipt onto a
  // later sheet even though it is absolutely positioned.
  if (preview) return bill;
  return typeof document === "undefined"
    ? bill
    : createPortal(bill, document.body);
}

export { PrintableBill };
