import React, { useMemo, useState } from "react";
import { ConfirmModal } from "../../../../shared/components/ConfirmModal";

const rupee = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function ShiftEndDialog({
  summary,
  dateLabel,
  preparation,
  onConfirm,
  onClose,
}) {
  const [phase, setPhase] = useState("reconcile");
  const [counts, setCounts] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [skipCount, setSkipCount] = useState(false);
  const denominations = useMemo(
    () =>
      (preparation?.denominations || []).map((item) => ({
        ...item,
        key: item.code,
        kind: String(item.kind || "").toLowerCase(),
        value: Number(item.value),
      })),
    [preparation],
  );
  const denominationGroups = useMemo(
    () =>
      ["note", "coin"].map((kind) => ({
        label: kind === "note" ? "Notes" : "Coins",
        items: denominations.filter((item) => item.kind === kind),
      })),
    [denominations],
  );
  const expectedCash = Number(preparation?.expectedCash || 0);
  const previousSubmittedCash = Number(preparation?.previousSubmittedCash || 0);
  const cumulativeExpectedCash = Number(
    preparation?.cumulativeExpectedCash || expectedCash,
  );
  const isRepeatedShift =
    Number(preparation?.segmentNumber || 1) > 1 || previousSubmittedCash !== 0;
  const cashDirection = expectedCash < 0 ? -1 : 1;
  const countedMagnitude = denominations.reduce(
    (total, item) => total + item.value * Number(counts[item.key] || 0),
    0,
  );
  const countedCash = cashDirection * countedMagnitude;
  const denominationDifference = Math.abs(expectedCash) - Math.abs(countedCash);
  const matched = skipCount || Math.abs(denominationDifference) < 0.005;

  const updateCount = (key, rawValue) => {
    const value = String(rawValue).replace(/\D/g, "").slice(0, 4);
    setCounts((current) => ({ ...current, [key]: value }));
  };
  const reconciliation = {
    reconciliationMode: skipCount ? "SKIPPED" : "DENOMINATION",
    expectedCash,
    countedCash: skipCount ? null : countedCash,
    denominations: skipCount
      ? []
      : denominations
          .map(({ code, value, kind }) => ({
            code,
            denomination: value,
            kind,
            quantity: Number(counts[code] || 0),
          }))
          .filter((item) => item.quantity > 0),
  };

  if (phase === "ended")
    return (
      <ConfirmModal
        tone="success"
        icon="check"
        title="Shift ended"
        lead={`${dateLabel} is closed. Print the shift report for the drawer hand-over, or close this.`}
        confirmLabel="Print shift report"
        cancelLabel="Close"
        onConfirm={() => window.print()}
        onCancel={onClose}
        content={
          <div className="shift-end-recap">
            <div>
              <span>Cash submitted</span>
              <strong>{rupee(cumulativeExpectedCash)}</strong>
            </div>
          </div>
        }
      />
    );

  if (phase === "confirm")
    return (
      <ConfirmModal
        tone="danger"
        icon="power"
        title="End this shift?"
        lead="Cash reconciliation is complete. Confirm to close today's shift and lock these totals."
        rows={[
          [
            "Bills processed",
            String(summary.collectionCount + summary.refundCount),
          ],
          ["Refunds", String(summary.refundCount)],
          ...(isRepeatedShift
            ? [
                ["Previously submitted", rupee(previousSubmittedCash)],
                ["New cash collected", rupee(expectedCash)],
                ["Total for today", rupee(cumulativeExpectedCash)],
              ]
            : [["Cash collected", rupee(expectedCash)]]),
          ["Cash counted", skipCount ? "Skipped" : rupee(countedCash)],
        ]}
        confirmLabel={saving ? "Ending shift…" : "End shift"}
        cancelLabel="Back"
        busy={saving}
        onConfirm={async () => {
          setSaving(true);
          setSubmitError("");
          try {
            await onConfirm(reconciliation);
            setPhase("ended");
          } catch (error) {
            setSubmitError(
              error.message || "The shift could not be closed. Try again.",
            );
          } finally {
            setSaving(false);
          }
        }}
        onCancel={() => setPhase("reconcile")}
        content={
          submitError ? (
            <p className="cash-reconcile-message error" role="alert">
              {submitError}
            </p>
          ) : null
        }
      />
    );

  return (
    <ConfirmModal
      className="shift-reconcile-modal"
      backdropClassName="shift-reconcile-backdrop"
      icon="arrow"
      title="Count today’s cash"
      lead={
        isRepeatedShift
          ? expectedCash < 0
            ? "Reconcile the cash paid out for refunds after restarting. Enter the notes and coins deducted from the earlier submission."
            : "Reconcile the new cash collected after restarting. The earlier submission remains included in today’s total."
          : "Enter the number of notes and coins collected at this counter. The counted total must match today’s cash collection before you can continue."
      }
      confirmLabel="Continue"
      cancelLabel="Cancel"
      confirmDisabled={!matched || !preparation?.canClose}
      onConfirm={() => setPhase("confirm")}
      onCancel={onClose}
      content={
        <div className="cash-reconcile">
          <div
            className={`cash-reconcile-summary ${isRepeatedShift ? "is-repeat" : ""}`}
            aria-live="polite"
          >
            {isRepeatedShift ? (
              <>
                <div>
                  <span>Previously submitted</span>
                  <strong>{rupee(previousSubmittedCash)}</strong>
                </div>
                <div>
                  <span>New cash collected</span>
                  <strong>{rupee(expectedCash)}</strong>
                </div>
                <div>
                  <span>Total for today</span>
                  <strong>{rupee(cumulativeExpectedCash)}</strong>
                </div>
              </>
            ) : (
              <>
                <div>
                  <span>Cash in Drawer</span>
                  <strong>{rupee(expectedCash)}</strong>
                </div>
                <div>
                  <span>Counted cash</span>
                  <strong>{skipCount ? "Skipped" : rupee(countedCash)}</strong>
                </div>
              </>
            )}
            <div
              className={
                matched ? "matched" : denominationDifference < 0 ? "over" : ""
              }
            >
              <span>
                {skipCount
                  ? "Note count"
                  : matched
                    ? "Status"
                    : denominationDifference > 0
                      ? "Remaining"
                      : "Excess"}
              </span>
              <strong>
                {skipCount
                  ? "Skipped"
                  : matched
                    ? "Matched"
                    : rupee(cashDirection * Math.abs(denominationDifference))}
              </strong>
            </div>
          </div>
          <label className="cash-reconcile-skip">
            <input
              type="checkbox"
              checked={skipCount}
              onChange={(event) => setSkipCount(event.target.checked)}
            />
            <span>
              <strong>Skip manual note and coin count</strong>
              <small>Continue without entering denomination quantities.</small>
            </span>
          </label>
          <div className="denomination-groups">
            {denominationGroups.map((group) => (
              <fieldset key={group.label} className="denomination-group">
                <legend>{group.label}</legend>
                <div className="denomination-grid">
                  {group.items.map((item) => {
                    const quantity = Number(counts[item.key] || 0);
                    return (
                      <label key={item.key} className="denomination-row">
                        <span>{item.label || `₹${item.value}`}</span>
                        <span className="denomination-times">×</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          autoComplete="off"
                          disabled={skipCount}
                          value={counts[item.key] || ""}
                          placeholder="0"
                          aria-label={`${item.label || `₹${item.value}`} ${item.kind} quantity`}
                          onChange={(event) =>
                            updateCount(item.key, event.target.value)
                          }
                        />
                        <output>
                          {rupee(cashDirection * item.value * quantity)}
                        </output>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
          <p className={`cash-reconcile-message ${matched ? "matched" : ""}`}>
            {!preparation?.canClose
              ? preparation?.blockers?.[0]?.message ||
                "Resolve the pending shift items before closing."
              : skipCount
                ? "Manual counting is skipped. You can continue to confirmation."
                : matched
                  ? "Cash matched. You can continue to the final confirmation."
                  : "Continue becomes available when the counted cash matches the expected amount."}
          </p>
        </div>
      }
    />
  );
}
