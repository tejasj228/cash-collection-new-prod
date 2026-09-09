import React from "react";
import { compactIdentifier } from "../../../shared/utils/formatters";
import { Icon } from "../../../shared/components/Icon";
import { Button, StatusPill } from "../../../shared/components/ui";

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

export { Confirmation };
