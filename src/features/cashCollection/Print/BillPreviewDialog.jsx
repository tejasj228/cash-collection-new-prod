import React, { useEffect } from "react";
import "./BillPreviewDialog.css";
import { Button } from "../../../shared/components/ui";
import { PrintableBill } from "./PrintableBill.jsx";

function BillPreviewDialog({ billProps, onClose, onPrint }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="bill-preview-backdrop">
      <section
        className="bill-preview-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bill-preview-title"
      >
        <header className="bill-preview-toolbar">
          <div>
            <h2 id="bill-preview-title">Bill preview</h2>
            <p>The bill is ready. You can print it again before closing.</p>
          </div>
          <div className="bill-preview-actions">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button icon="print" onClick={onPrint}>
              Print
            </Button>
          </div>
        </header>
        <div className="bill-preview-canvas">
          <PrintableBill {...billProps} preview />
        </div>
      </section>
    </div>
  );
}

export { BillPreviewDialog };
