import React from "react";

const rupee = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Print-only end-of-shift reconciliation sheet. Always in the DOM once a shift
// has been ended (like PrintableBill in the workspace); revealed by @media
// print only.
export function ShiftReport({ snapshot }) {
  if (!snapshot) return null;
  const { dateLabel, summary } = snapshot;
  return (
    <div className="shift-report" aria-hidden="true">
      <h1>Cash Collection — Shift Report</h1>
      <div className="shift-report-meta">
        <span>Date: {dateLabel}</span>
        <span>Generated: {new Date().toLocaleString("en-GB")}</span>
      </div>

      <table className="shift-report-totals">
        <tbody>
          <tr>
            <th>Bills posted</th>
            <td>{summary.collectionCount + summary.refundCount}</td>
          </tr>
          <tr>
            <th>Gross collected</th>
            <td>{rupee(summary.collectedTotal)}</td>
          </tr>
          <tr>
            <th>Refunds issued ({summary.refundCount})</th>
            <td>− {rupee(summary.refundTotal)}</td>
          </tr>
          <tr>
            <th>Bills cancelled</th>
            <td>{summary.cancelCount}</td>
          </tr>
          <tr className="shift-report-net">
            <th>Net collection</th>
            <td>{rupee(summary.net)}</td>
          </tr>
          <tr className="shift-report-drawer">
            <th>Cash in drawer (hand over)</th>
            <td>{rupee(summary.cashInDrawer)}</td>
          </tr>
        </tbody>
      </table>

      <h2>By payment mode</h2>
      <table className="shift-report-modes">
        <thead>
          <tr>
            <th>Mode</th>
            <th>Bills</th>
            <th>Collected</th>
            <th>Refunded</th>
            <th>Net</th>
          </tr>
        </thead>
        <tbody>
          {summary.byMode.map((row) => (
            <tr key={row.mode}>
              <td>{row.mode}</td>
              <td>{row.count}</td>
              <td>{rupee(row.collected)}</td>
              <td>{rupee(row.refunded)}</td>
              <td>{rupee(row.net)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="shift-report-sign">
        <span>Collected by ____________________</span>
        <span>Verified by ____________________</span>
      </div>
    </div>
  );
}
