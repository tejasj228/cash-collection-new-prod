import React, { useState } from "react";
import "./Confirmation.css";
import { useAppData } from "../../../app/providers/AppDataProvider";
import { useEscapeToClose } from "../../../shared/hooks/useEscapeToClose";
import { useModalClose } from "../../../shared/hooks/useModalClose";
import {
  compactIdentifier,
  displayDate,
} from "../../../shared/utils/formatters";
import { Icon } from "../../../shared/components/Icon";
import { Button, StatusPill } from "../../../shared/components/ui";
import { TextField } from "../../../shared/components/FormFields";
import { isCardPaymentMode } from "../CollectionDetails/PaymentDetails/paymentDetails";

function Confirmation({ data, onNew, onPrint }) {
  return (
    <div className="confirmation-screen">
      <div className="success-orbit">
        <div className="success-check">
          <Icon name="check" size={30} strokeWidth={2.3} />
        </div>
        <span />
        <span />
        <span />
      </div>
      <h1>Collection Confirmed</h1>
      <div className="receipt-card">
        <div className="receipt-card-top">
          <div>
            <span>Bill No.</span>
            <strong>
              {data?.receiptNo ? compactIdentifier(data.receiptNo) : "—"}
            </strong>
          </div>
          <StatusPill>{data?.status || "—"}</StatusPill>
        </div>
        <div className="receipt-divider" />
        <div className="receipt-grid">
          <div>
            <span>Patient Name</span>
            <strong>{data?.patientName || "—"}</strong>
          </div>
          <div>
            <span>CR No.</span>
            <strong className="mono">
              {data?.cr ? compactIdentifier(data.cr) : "—"}
            </strong>
          </div>
          <div>
            <span>Amount Collected</span>
            <strong>{data?.amount ? `₹${data.amount}` : "—"}</strong>
          </div>
          <div>
            <span>Payment Mode</span>
            <strong>{data?.paymentMode || "—"}</strong>
          </div>
        </div>
        <div className="receipt-actions">
          <Button variant="soft" onClick={onPrint} icon="print">
            Print Bill
          </Button>
          <Button onClick={onNew} icon="arrow">
            New Collection
          </Button>
        </div>
      </div>
      <button className="back-dashboard" onClick={onNew}>
        <Icon name="back" size={14} />
        Return to Cash Collection
      </button>
    </div>
  );
}

function ConfirmDialog({
  title,
  lead,
  rows,
  confirmLabel,
  dismissible = true,
  onConfirm,
  onCancel,
}) {
  const { closing, requestClose } = useModalClose(onCancel);
  useEscapeToClose(requestClose, dismissible);
  return (
    <div
      className="popover-backdrop"
      data-closing={closing || undefined}
      onMouseDown={dismissible ? requestClose : undefined}
    >
      <div
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="confirm-head">
          <strong>{title}</strong>
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
          <Button onClick={onConfirm} icon="print">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ManualPaymentDialog({ paymentMode, cardType, onSave, onCancel }) {
  const { closing, requestClose } = useModalClose(onCancel);
  useEscapeToClose(requestClose);
  const { todayIso } = useAppData();
  const [bankName, setBankName] = useState("");
  const [reference, setReference] = useState("");
  const [cardLastFour, setCardLastFour] = useState("");
  const [transactionDate, setTransactionDate] = useState(displayDate(todayIso));
  const isCard = isCardPaymentMode(paymentMode);
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
    <div
      className="popover-backdrop"
      data-closing={closing || undefined}
      onMouseDown={requestClose}
    >
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
          <button
            className="plain-icon"
            onClick={requestClose}
            aria-label="Close"
          >
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
        </div>
        <div className="manual-payment-actions">
          <button className="button button-ghost" onClick={requestClose}>
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

export { Confirmation, ConfirmDialog, ManualPaymentDialog };
