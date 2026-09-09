import React, { useState } from "react";
import { useAppData } from "../../../../app/providers/AppDataProvider";
import { useEscapeToClose } from "../../../../shared/hooks/useEscapeToClose";
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
import { Icon } from "../../../../shared/components/Icon";
import { Button } from "../../../../shared/components/ui";
import { TextField } from "../../../../shared/components/FormFields";

function TariffDetailsDialog({ lines, context, onCancel }) {
  useEscapeToClose(onCancel);
  return (
    <div className="popover-backdrop" onMouseDown={onCancel}>
      <div
        className="confirm-dialog tariff-details-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tariff-details-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="confirm-head">
          <strong id="tariff-details-title">Tariff Details</strong>
          <button className="plain-icon" onClick={onCancel} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="table-wrap tariff-details-table">
          <table>
            <thead>
              <tr>
                <th className="col-c">S. No.</th>
                <th className="col-c">Req No.</th>
                <th className="col-c">Req Date</th>
                <th>Raised Department</th>
                <th>Tariff Name</th>
                <th className="num">Qty</th>
                <th className="num">Actual Amt</th>
                <th className="num">Exemption (Pkg/Disc)</th>
                <th className="num">Net Amt</th>
                <th>Payment Mode</th>
                <th className="col-c">Mode</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={line.key || line.code}>
                  <td className="col-c">{index + 1}</td>
                  <td className="col-c">
                    {context.reqNo ? (
                      <span className="request-id">
                        {compactIdentifier(context.reqNo)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="col-c cell-muted">{context.reqDate || "—"}</td>
                  <td className="cell-muted">{context.deptWard || "—"}</td>
                  <td>
                    <strong>{line.name}</strong>
                  </td>
                  <td className="num mono">{line.qty}</td>
                  <td className="num mono">₹{money(lineGross(line))}</td>
                  <td className="num mono">
                    ₹{money(lineDiscountAmount(line))}
                  </td>
                  <td className="num amount-cell mono">
                    ₹{money(lineNet(line))}
                  </td>
                  <td>{context.paymentMode || "—"}</td>
                  <td className="col-c">{context.channel || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="confirm-actions">
          <button className="link-button" onClick={onCancel}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({
  title,
  lead,
  rows,
  confirmLabel,
  onConfirm,
  onCancel,
}) {
  useEscapeToClose(onCancel);
  return (
    <div className="popover-backdrop" onMouseDown={onCancel}>
      <div
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="confirm-head">
          <strong>{title}</strong>
          <button className="plain-icon" onClick={onCancel} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>
        <p className="confirm-lead">{lead}</p>
        <dl className="confirm-rows">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="confirm-actions">
          <button className="link-button" onClick={onCancel}>
            Cancel
          </button>
          <Button onClick={onConfirm} icon="print">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ManualPaymentDialog({ paymentMode, cardType, onSave, onCancel }) {
  useEscapeToClose(onCancel);
  const { todayIso } = useAppData();
  const [bankName, setBankName] = useState("");
  const [reference, setReference] = useState("");
  const [cardLastFour, setCardLastFour] = useState("");
  const [transactionDate, setTransactionDate] = useState(displayDate(todayIso));
  const isCard = paymentMode === "Card";
  const validDate = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(transactionDate);
  const validCalendarDate = Boolean(
    validDate &&
    (() => {
      const candidate = new Date(
        `${validDate[3]}-${validDate[2]}-${validDate[1]}T12:00:00`,
      );
      return (
        !Number.isNaN(candidate.getTime()) &&
        candidate.getFullYear() === Number(validDate[3]) &&
        candidate.getMonth() + 1 === Number(validDate[2]) &&
        candidate.getDate() === Number(validDate[1])
      );
    })(),
  );
  const canSave =
    bankName.trim() &&
    reference.trim() &&
    validCalendarDate &&
    (!isCard || /^\d{4}$/.test(cardLastFour));
  const save = () => {
    const details = isCard
      ? `${bankName.trim()}, ${cardLastFour}, ${reference.trim()}, ${transactionDate.trim()}, ${cardType}`
      : `${bankName.trim()}, ${reference.trim()}, ${transactionDate.trim()}`;
    onSave({
      bankName: bankName.trim(),
      reference: reference.trim(),
      cardLastFour: isCard ? cardLastFour : null,
      transactionDate: transactionDate.trim(),
      cardType: isCard ? cardType : null,
      summary: details,
    });
  };

  return (
    <div className="popover-backdrop" onMouseDown={onCancel}>
      <div
        className="manual-payment-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-payment-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="manual-payment-head">
          <h2 id="manual-payment-title">
            Payment Details · {isCard ? "Credit / Debit Card" : "UPI"}
          </h2>
          <button className="plain-icon" onClick={onCancel} aria-label="Close">
            <Icon name="close" size={17} />
          </button>
        </div>
        <div className="manual-payment-fields">
          <TextField
            label={isCard ? "Bank Name" : "Bank / UPI App"}
            value={bankName}
            onChange={setBankName}
            placeholder={
              isCard ? "Enter issuing bank" : "Enter bank or UPI app"
            }
            required
          />
          {isCard && (
            <TextField
              label="Card No. (Last 4 Digits)"
              value={cardLastFour}
              onChange={(value) =>
                setCardLastFour(value.replace(/\D/g, "").slice(0, 4))
              }
              placeholder="0000"
              required
              mono
            />
          )}
          <TextField
            label={
              isCard ? "Transaction No. (Max 15 Digits)" : "UPI Transaction ID"
            }
            value={reference}
            onChange={(value) =>
              setReference(
                isCard
                  ? value.replace(/\D/g, "").slice(0, 15)
                  : value.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 40),
              )
            }
            placeholder="Enter transaction ID"
            required
            mono
          />
          <TextField
            label="Transaction Date"
            value={transactionDate}
            onChange={(value) => {
              const digits = value.replace(/\D/g, "").slice(0, 8);
              setTransactionDate(
                [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)]
                  .filter(Boolean)
                  .join("/"),
              );
            }}
            placeholder="DD/MM/YYYY"
            required
            inputMode="numeric"
            maxLength={10}
            invalid={Boolean(transactionDate && !validCalendarDate)}
          />
          {isCard && (
            <div className="manual-readonly">
              <span>Card Type</span>
              <strong>{cardType}</strong>
            </div>
          )}
        </div>
        <p className="manual-payment-warning">
          Use this only after the POS terminal transaction fails and the payment
          can be verified manually.
        </p>
        <div className="manual-payment-actions">
          <button className="button button-ghost" onClick={onCancel}>
            Cancel
          </button>
          <Button onClick={save} disabled={!canSave}>
            Save Details
          </Button>
        </div>
      </div>
    </div>
  );
}

export { TariffDetailsDialog, ConfirmDialog, ManualPaymentDialog };
