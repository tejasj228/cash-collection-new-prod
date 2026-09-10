import React from "react";
import { useEscapeToClose } from "../hooks/useEscapeToClose";
import { useModalClose } from "../hooks/useModalClose";
import { Button } from "./ui";

/**
 * A general confirm dialog with a Cancel escape hatch — for reversible-ish
 * actions like cancelling a bill or ending a shift. (The workspace's
 * ConfirmDialog is deliberately confirm-only; this is not that.)
 * Animated open/close, closes on backdrop click and Escape.
 * `children` renders below the actions — used for a second "done" state.
 */
export function ConfirmModal({
  title,
  lead,
  rows,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone,
  icon,
  busy = false,
  confirmDisabled = false,
  className = "",
  backdropClassName = "",
  content,
  onConfirm,
  onCancel,
  children,
}) {
  const { closing, requestClose } = useModalClose(onCancel);
  useEscapeToClose(requestClose);
  return (
    <div
      className={`popover-backdrop ${backdropClassName}`.trim()}
      data-closing={closing || undefined}
      onMouseDown={requestClose}
    >
      <div
        className={`confirm-dialog confirm-modal ${tone ? `tone-${tone}` : ""} ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="confirm-head">
          <strong>{title}</strong>
        </div>
        {lead && <p className="confirm-lead">{lead}</p>}
        {rows?.length ? (
          <dl className="confirm-rows">
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {content}
        <div className="confirm-actions">
          <Button variant="soft" onClick={requestClose}>
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            icon={icon}
            disabled={busy || confirmDisabled}
            variant={tone === "danger" ? "primary" : "primary"}
          >
            {confirmLabel}
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
