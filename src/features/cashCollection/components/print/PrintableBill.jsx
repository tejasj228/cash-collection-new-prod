import React from "react";
import { useAppData } from "../../../../app/providers/AppDataProvider";
import {
  displayDate,
  money,
  compactIdentifier,
} from "../../../../shared/utils/formatters";
import {
  lineGross,
  lineDiscountAmount,
  lineNet,
} from "../../model/chargeCalculations";

const SLIP_WIDTH = 94;

const padRight = (value, width) =>
  String(value ?? "")
    .slice(0, width)
    .padEnd(width, " ");

const padLeft = (value, width) =>
  String(value ?? "")
    .slice(0, width)
    .padStart(width, " ");

const centreLine = (value, width = SLIP_WIDTH) => {
  const text = String(value ?? "").slice(0, width);
  const left = Math.max(0, Math.floor((width - text.length) / 2));
  return " ".repeat(left) + text;
};

const slipField = (label, value, valueWidth) =>
  padRight(label, 10) +
  ": " +
  padRight(String(value ?? "").toUpperCase(), valueWidth);

function buildSlip({
  receiptNo,
  patient,
  lines,
  total,
  payment,
  requestType,
  documentDate,
}) {
  const isRefund = requestType === "Refund";
  const isEstimate = requestType === "Estimation";
  const rule = "-".repeat(SLIP_WIDTH);
  const gross = lines.reduce((sum, line) => sum + lineGross(line), 0);
  const discount = lines.reduce(
    (sum, line) => sum + lineDiscountAmount(line),
    0,
  );
  const out = [];

  out.push("");
  out.push(
    centreLine(
      `[${isEstimate ? "ESTIMATION" : isRefund ? "REFUND" : "SERVICE"} RECEIPT]`,
    ),
  );
  out.push("");
  out.push(
    slipField("CR No.", patient ? compactIdentifier(patient.cr) : "-", 20) +
      slipField("DATE&TIME", documentDate || "-", 18) +
      slipField("BILL No.", receiptNo, 20),
  );
  out.push(slipField("NAME", patient ? patient.name : "-", SLIP_WIDTH - 12));
  out.push(
    slipField("CATEGORY", patient ? patient.category : "-", 20) +
      slipField(
        "AGE/SEX",
        patient ? `${patient.age}/${String(patient.sex || "").charAt(0)}` : "-",
        18,
      ) +
      slipField("DEPARTMENT", patient ? patient.department : "-", 20),
  );
  if (patient && patient.ward && patient.ward !== "—") {
    out.push(
      slipField("WARD/BED", `${patient.ward} / ${patient.bed}`, 20) +
        slipField("ADMN No.", compactIdentifier(patient.ipd), 18) +
        slipField("ACCOUNT", compactIdentifier(patient.account), 20),
    );
  }
  out.push("");
  out.push(rule);
  out.push(
    padRight("S.No.", 6) +
      padRight("PROCEDURE/INVESTIGATION/SERVICE", 40) +
      padRight("LOCATION", 15) +
      padLeft("RATE(Rs.)", 10) +
      padLeft("QTY.", 8) +
      padLeft("AMOUNT(Rs.)", 15),
  );
  out.push(rule);
  lines.forEach((line, index) => {
    out.push(
      padRight(index + 1, 6) +
        padRight(String(line.name || "").toUpperCase(), 40) +
        padRight(String(line.group || "").toUpperCase(), 15) +
        padLeft(money(line.rate), 10) +
        padLeft(line.qty, 8) +
        padLeft(money(lineNet(line)), 15),
    );
  });
  out.push(rule);
  out.push(
    padLeft("GROSS AMOUNT (Rs.) :", SLIP_WIDTH - 15) +
      padLeft(money(gross), 15),
  );
  if (discount > 0)
    out.push(
      padLeft("LESS DISCOUNT (Rs.) :", SLIP_WIDTH - 15) +
        padLeft(money(discount), 15),
    );
  out.push(
    padLeft(
      `${isRefund ? "AMOUNT REFUNDED" : isEstimate ? "ESTIMATED TOTAL" : "AMOUNT RECEIVED"} (Rs.) :`,
      SLIP_WIDTH - 15,
    ) + padLeft(money(total), 15),
  );
  out.push(rule);
  out.push("");
  out.push(slipField("PAYMENT", payment, SLIP_WIDTH - 12));
  out.push("");
  out.push("");
  out.push(padLeft("SIGNATURE OF CASHIER", SLIP_WIDTH));
  out.push("");
  out.push(centreLine("THIS IS A COMPUTER GENERATED RECEIPT."));
  return out.join("\n");
}

function PrintableBill({
  receiptNo,
  patient,
  lines,
  total,
  payment,
  requestType,
  documentDate,
}) {
  const { todayIso, facility } = useAppData();
  const isEstimate = requestType === "Estimation";
  const date = documentDate || displayDate(todayIso);
  const slip = buildSlip({
    receiptNo: compactIdentifier(receiptNo),
    patient,
    lines,
    total,
    payment,
    requestType,
    documentDate: date,
  });
  return (
    <div className="print-bill">
      <div className="slip-header">
        <strong>{facility?.name || ""}</strong>
        {facility?.subtitle && <span>{facility.subtitle}</span>}
        {facility?.address && <span>{facility.address}</span>}
      </div>
      <table className="slip-banner">
        <tbody>
          <tr>
            <td className="SLIPCONTROLBOLD">
              {isEstimate ? "ESTIMATION RECEIPT" : "BILLING SERVICES RECEIPT"}
            </td>
          </tr>
        </tbody>
      </table>
      <table className="slip-body">
        <tbody>
          <tr>
            <td>
              <pre>{slip}</pre>
            </td>
          </tr>
          {isEstimate && (
            <tr>
              <td className="slip-notpaid">NOT PAID</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export { buildSlip, PrintableBill };
