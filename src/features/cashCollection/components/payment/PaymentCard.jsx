import React, { useEffect, useState } from "react";
import { useAppData } from "../../../../app/providers/AppDataProvider";
import { money, compactIdentifier } from "../../../../shared/utils/formatters";
import { Icon } from "../../../../shared/components/Icon";
import { Button } from "../../../../shared/components/ui";
import {
  SelectField,
  TextField,
} from "../../../../shared/components/FormFields";
import { ConfirmDialog, ManualPaymentDialog } from "../dialogs/Dialogs";

const blockedModes = (category, restrictionsByCategory) =>
  Object.entries(restrictionsByCategory || {}).reduce(
    (result, [match, restrictions]) =>
      category && category.includes(match)
        ? { ...result, ...restrictions }
        : result,
    {},
  );

function PaymentCard({
  paymentMode,
  setPaymentMode,
  total,
  requestType,
  patient,
  onConfirm,
  services,
  onModalVisibilityChange,
}) {
  const { paymentOptions } = useAppData();
  const {
    modes: allPaymentModes,
    cardTypes,
    posTerminals,
    restrictionsByCategory,
  } = paymentOptions;
  const [confirming, setConfirming] = useState(false);
  const [manualDetailsOpen, setManualDetailsOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [cardType, setCardType] = useState("Debit Card");
  const [terminal, setTerminal] = useState(posTerminals[0] || "");
  const [posState, setPosState] = useState("idle");
  const [posSession, setPosSession] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(300);
  const [approval, setApproval] = useState(null);
  const [manualDetails, setManualDetails] = useState(null);
  const [operationError, setOperationError] = useState("");
  useEffect(() => {
    onModalVisibilityChange?.(confirming || manualDetailsOpen);
  }, [confirming, manualDetailsOpen, onModalVisibilityChange]);
  const isRefund = requestType === "Refund";
  const isEstimate = requestType === "Estimation";
  const blocked = blockedModes(
    patient && patient.category,
    restrictionsByCategory,
  );
  const usesTerminal = paymentMode === "Card" || paymentMode === "UPI";
  const needsDescription = paymentMode === "Cheque";
  const canPost =
    total > 0 && (!needsDescription || Boolean(description.trim()));
  const canManualPost =
    usesTerminal &&
    posState === "manual" &&
    Boolean(description.trim()) &&
    total > 0;
  const formatTimer = (seconds) =>
    `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  const resetPos = () => {
    setPosState("idle");
    setPosSession(null);
    setRemainingSeconds(300);
    setApproval(null);
    setManualDetails(null);
    setDescription("");
    setManualDetailsOpen(false);
    setOperationError("");
    setConfirming(false);
  };

  useEffect(() => {
    if (posState !== "processing" || !posSession) return undefined;
    let disposed = false;
    let pollTimer;
    const expiresAt =
      Date.now() + Number(posSession.expiresInSeconds || 300) * 1000;
    const countdown = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setRemainingSeconds(remaining);
      if (remaining === 0) {
        setPosState("failed");
        setOperationError(
          "The terminal request expired after five minutes. Retry or enter verified manual details.",
        );
      }
    }, 1000);
    const poll = async () => {
      if (disposed) return;
      try {
        if (typeof services?.getTerminalPaymentStatus !== "function")
          throw new Error("Terminal payment status service is unavailable.");
        const result = await services.getTerminalPaymentStatus({
          terminalTransactionId: posSession.terminalTransactionId,
        });
        if (disposed) return;
        const status = String(result?.status || "").toUpperCase();
        if (status === "APPROVED" || status === "SUCCESS") {
          const fresh = {
            code: result.approvalCode,
            last4: result.cardLastFour,
          };
          setApproval(fresh);
          setPosSession((current) => ({ ...current, ...result }));
          setPosState("approved");
          setConfirming(true);
          return;
        }
        if (["FAILED", "DECLINED", "CANCELLED", "EXPIRED"].includes(status)) {
          setPosState("failed");
          setOperationError(
            result?.message ||
              "The terminal transaction failed. Enter verified manual details or retry.",
          );
          return;
        }
        pollTimer = window.setTimeout(
          poll,
          Number(posSession.pollAfterMs || 10000),
        );
      } catch (error) {
        if (!disposed) {
          setPosState("failed");
          setOperationError(
            error?.message ||
              "The terminal status could not be checked. Enter verified manual details or retry.",
          );
        }
      }
    };
    pollTimer = window.setTimeout(
      poll,
      Number(
        posSession.prototypeAutoApproveAfterMs ||
          posSession.pollAfterMs ||
          10000,
      ),
    );
    return () => {
      disposed = true;
      window.clearInterval(countdown);
      window.clearTimeout(pollTimer);
    };
    // The terminal transaction identifier is the lifecycle key; other session
    // fields are immutable for that attempt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posState, posSession?.terminalTransactionId, services]);

  const submitPayment = async (payment) => {
    try {
      await onConfirm(payment);
    } catch (error) {
      setOperationError(
        error?.message ||
          "The transaction could not be posted. Nothing was printed.",
      );
    }
  };
  const startTerminalPayment = async () => {
    if (!usesTerminal || total <= 0 || !terminal || posState === "processing")
      return;
    setOperationError("");
    setApproval(null);
    setRemainingSeconds(300);
    setPosState("processing");
    try {
      if (typeof services?.initiateTerminalPayment !== "function")
        throw new Error("Terminal payment service is unavailable.");
      const result = await services.initiateTerminalPayment({
        paymentMode,
        cardType,
        terminalId: terminal,
        amount: total,
        patientId: patient?.id || null,
        description: description.trim(),
      });
      if (!result?.terminalTransactionId)
        throw new Error("The terminal did not return a transaction ID.");
      setRemainingSeconds(Number(result.expiresInSeconds || 300));
      setPosSession(result);
    } catch (error) {
      setPosState("failed");
      setOperationError(
        error?.message || "The terminal request could not be initiated.",
      );
    }
  };
  const confirmAndPrint = async () => {
    setConfirming(false);
    setOperationError("");
    let payment = {
      mode: paymentMode,
      description: description.trim(),
      summary: paymentMode,
    };
    if (usesTerminal) {
      if (posState !== "approved" || !posSession) {
        setOperationError(
          "Wait for terminal approval before confirming this transaction.",
        );
        return;
      }
      payment = {
        ...payment,
        cardType: paymentMode === "Card" ? cardType : null,
        terminalId: terminal,
        terminalApproval: posSession,
        summary:
          paymentMode === "Card"
            ? `${cardType}${approval?.last4 ? ` ending ${approval.last4}` : ""} · ${terminal} · Approval ${approval?.code || "received"}`
            : `UPI · ${terminal} · Approval ${approval?.code || "received"}`,
      };
    } else if (description.trim())
      payment.summary = `${paymentMode} · ${description.trim()}`;
    await submitPayment(payment);
  };
  const changeMode = (value) => {
    setPaymentMode(value);
    resetPos();
  };
  const saveManualDetails = (details) => {
    setManualDetails(details);
    setDescription(details.summary);
    setPosSession(null);
    setApproval(null);
    setOperationError("");
    setPosState("manual");
    setManualDetailsOpen(false);
  };
  const confirmManualPayment = () =>
    submitPayment({
      mode: paymentMode,
      cardType: paymentMode === "Card" ? cardType : null,
      terminalId: terminal,
      description: description.trim(),
      manualDetails,
      summary: `${paymentMode} · Manual fallback · ${description.trim()}`,
    });

  return (
    <section className="panel payment-panel">
      <div className="panel-header">
        <div>
          <h2 className="tariff-details-title payment-details-title">
            <span className="tariff-title-icon payment-title-icon">
              <Icon name="wallet" size={16} />
            </span>
            {isEstimate ? "Review Estimate" : "Payment Details"}
          </h2>
        </div>
        <span className="secure-label">
          <Icon name="lock" size={13} /> Secure
        </span>
      </div>
      {!isEstimate && (
        <>
          <div
            className={`payment-row ${usesTerminal ? (paymentMode === "Card" ? "with-card" : "with-upi") : "with-note"}`}
          >
            <SelectField
              label="Payment Mode"
              required
              value={paymentMode}
              onChange={changeMode}
              options={allPaymentModes.map((mode) => ({
                id: mode,
                label: blocked[mode] ? `${mode} — not permitted` : mode,
                disabled: Boolean(blocked[mode]),
              }))}
            />
            {paymentMode === "Card" && (
              <SelectField
                label="Card Type"
                value={cardType}
                onChange={(value) => {
                  setCardType(value);
                  resetPos();
                }}
                options={cardTypes}
              />
            )}
            {usesTerminal && (
              <SelectField
                label="POS Terminal"
                value={terminal}
                onChange={(value) => {
                  setTerminal(value);
                  resetPos();
                }}
                options={posTerminals}
              />
            )}
            {usesTerminal && (
              <TextField
                label="Payment Description"
                value={description}
                onChange={setDescription}
                placeholder="Enter payment note"
              />
            )}
            {usesTerminal && (
              <div className="field manual-trigger-field">
                <span className="field-label">Manual Details</span>
                <button
                  type="button"
                  className="manual-details-trigger"
                  onClick={() => setManualDetailsOpen(true)}
                  title="Enter verified payment details manually"
                  aria-label="Enter manual payment details"
                >
                  <Icon name="edit" size={16} />
                </button>
              </div>
            )}
            {usesTerminal && (
              <div className="field">
                <span className="field-label pos-spacer">Terminal Payment</span>
                <Button
                  className={`pos-button pos-${posState}`}
                  variant={posState === "approved" ? "ghost" : "soft"}
                  onClick={
                    posState === "approved"
                      ? () => setConfirming(true)
                      : startTerminalPayment
                  }
                  disabled={
                    total <= 0 || !terminal || posState === "processing"
                  }
                  icon={posState === "approved" ? "check" : "arrow"}
                >
                  {posState === "processing"
                    ? "Waiting"
                    : posState === "approved"
                      ? "Approved"
                      : posState === "failed"
                        ? "Retry Transaction"
                        : "Initiate Payment"}
                </Button>
              </div>
            )}
            {!usesTerminal && (
              <TextField
                label="Payment Description"
                value={description}
                onChange={setDescription}
                placeholder={
                  paymentMode === "Cheque"
                    ? "Enter cheque no., date and drawee bank"
                    : "Enter payment note"
                }
                required={needsDescription}
                invalid={needsDescription && !description.trim()}
              />
            )}
          </div>
          {posState === "processing" && (
            <div className="pos-progress" role="status">
              <span className="pos-progress-icon">
                <Icon name="clock" size={18} />
              </span>
              <div>
                <strong>Waiting for terminal</strong>
                <span>Status is checked every 10 seconds.</span>
              </div>
              <span className="pos-timer">{formatTimer(remainingSeconds)}</span>
            </div>
          )}
          {total <= 0 && (
            <div className="payment-check idle">
              <span>
                <Icon name="info" size={14} /> Add at least one tariff to
                continue
              </span>
            </div>
          )}
          {needsDescription && !description.trim() && total > 0 && (
            <div className="payment-check idle">
              <span>
                <Icon name="info" size={14} /> Enter the cheque number, date and
                drawee bank to continue
              </span>
            </div>
          )}
          {operationError && (
            <div className="payment-check error">
              <span>
                <Icon name="info" size={14} />
                {operationError}
              </span>
            </div>
          )}
        </>
      )}
      {isEstimate && (
        <div className="estimate-banner">
          <div className="estimate-icon">
            <Icon name="receipt" size={19} />
          </div>
          <div>
            <strong>This Is an Estimate Only</strong>
            <span>
              No bill or payment entry will be created. You can print the
              estimate for the patient.
            </span>
          </div>
        </div>
      )}
      <div className="payment-actions">
        <Button variant="ghost" onClick={() => window.history.back()}>
          Cancel
        </Button>
        {!usesTerminal && (
          <Button
            onClick={() => setConfirming(true)}
            disabled={!isEstimate && !canPost}
            icon={isEstimate ? "print" : "check"}
          >
            {isEstimate
              ? "Save & Print Estimate"
              : isRefund
                ? `Refund ₹${money(total)}`
                : `Collect ₹${money(total)}`}
          </Button>
        )}
        {usesTerminal && (
          <Button
            onClick={confirmManualPayment}
            disabled={!canManualPost}
            icon="check"
          >
            {isRefund ? `Refund ₹${money(total)}` : `Collect ₹${money(total)}`}
          </Button>
        )}
      </div>
      {confirming && (
        <ConfirmDialog
          title={
            isEstimate
              ? "Print this estimate?"
              : isRefund
                ? "Confirm this refund?"
                : "Confirm this collection?"
          }
          lead={
            usesTerminal
              ? `Terminal approval ${approval?.code || ""} was received. Confirm to post the transaction and print the bill.`
              : "This posts the transaction and opens the bill for printing."
          }
          rows={[
            ["Patient Name", patient ? patient.name : "—"],
            ["CR No.", patient ? compactIdentifier(patient.cr) : "—"],
            [
              "Payment Mode",
              paymentMode === "Card"
                ? `${cardType} · ${terminal}`
                : paymentMode === "UPI"
                  ? `UPI · ${terminal}`
                  : paymentMode,
            ],
            [
              isRefund ? "Amount to Refund" : "Amount to Collect",
              `₹${money(total)}`,
            ],
          ]}
          confirmLabel={
            isRefund
              ? "Yes, refund & print"
              : isEstimate
                ? "Yes, print estimate"
                : "Yes, collect & print"
          }
          onConfirm={confirmAndPrint}
          dismissible={!usesTerminal}
          onCancel={() => setConfirming(false)}
        />
      )}
      {manualDetailsOpen && (
        <ManualPaymentDialog
          paymentMode={paymentMode}
          cardType={cardType}
          onSave={saveManualDetails}
          onCancel={() => setManualDetailsOpen(false)}
        />
      )}
    </section>
  );
}

export { PaymentCard };
