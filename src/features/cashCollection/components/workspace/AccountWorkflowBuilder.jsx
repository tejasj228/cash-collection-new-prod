import React, { useMemo } from "react";
import { WorkflowFamily } from "../../../../contracts/cashCollection.contract";
import { money, firstContextValue } from "../../../../shared/utils/formatters";
import {
  lineDiscountPercent,
  lineDiscountAmount,
  lineNet,
} from "../../model/chargeCalculations";
import { Icon } from "../../../../shared/components/Icon";
import {
  SelectField,
  TextField,
} from "../../../../shared/components/FormFields";

function AccountWorkflowBuilder({
  service,
  patient,
  workflow,
  requestType,
  amount,
  setAmount,
  lines,
  total,
  workflowContext,
  selections,
  setSelections,
  onDetails,
  onPay,
}) {
  const context = workflowContext || {};
  const isSettlement = [
    WorkflowFamily.BILL_SETTLEMENT,
    WorkflowFamily.BILL_SETTLEMENT_REFUND,
  ].includes(workflow.uiFamily);
  const isRefund = requestType === "Refund";
  const choices = (values, fallback) =>
    Array.isArray(values) && values.length
      ? values
      : [fallback || "Not available"];
  const select = (key, values, fallback, label, required = false) => (
    <SelectField
      label={label}
      value={selections[key] || firstContextValue(values, fallback)}
      onChange={(value) =>
        setSelections((current) => ({ ...current, [key]: value }))
      }
      options={choices(values, fallback)}
      required={required}
    />
  );
  const heading = isSettlement
    ? `${service.label} Bill Settlement Details`
    : `${service.label} ${workflow.label} Details`;
  // The IPD Final Adjustment queue collapses tariffs into their billing
  // group (e.g. Accommodation, Investigation) in the outer table — the
  // Details popup for a group then lists every tariff inside it.
  const groupedLines = useMemo(() => {
    const order = [];
    const byGroup = new Map();
    for (const line of lines) {
      const key = line.group || "Other";
      if (!byGroup.has(key)) {
        byGroup.set(key, []);
        order.push(key);
      }
      byGroup.get(key).push(line);
    }
    return order.map((group) => {
      const groupLines = byGroup.get(group);
      return {
        group,
        lines: groupLines,
        discount: groupLines.reduce(
          (sum, item) => sum + lineDiscountAmount(item),
          0,
        ),
        net: groupLines.reduce((sum, item) => sum + lineNet(item), 0),
      };
    });
  }, [lines]);
  return (
    <section className="panel charges-panel account-workflow-panel">
      <div className="panel-header">
        <div>
          <h2>{heading}</h2>
        </div>
      </div>
      <div
        className={`account-workflow-fields ${isSettlement ? "settlement-fields" : ""}`}
      >
        {select(
          "raisingDepartmentId",
          context.raisingDepartments,
          patient?.department,
          "Department",
        )}
        {select("episodeId", context.episodes, patient?.episode, "Episode")}
        {select(
          "patientCategoryId",
          context.patientCategories,
          patient?.category,
          "Patient Category",
        )}
        {isSettlement && (
          <>
            {select(
              "roomTypeId",
              context.roomTypes,
              patient?.roomType,
              "Ward Type",
            )}
            {select("wardId", context.wards, patient?.ward, "Ward Name")}
          </>
        )}
      </div>
      {isSettlement && (
        <div className="settlement-breakdown">
          <div className="settlement-breakdown-heading">
            <div>
              <h3 className="tariff-details-title">
                <span className="tariff-title-icon">
                  <Icon name="receipt" size={16} />
                </span>
                {onDetails ? "Final Adjustment Details" : "Tariff Details"}
              </h3>
            </div>
            <span className="muted-count">
              {onDetails ? groupedLines.length : lines.length}
            </span>
          </div>
          <div className="table-wrap charge-table settlement-charge-table">
            {onDetails ? (
              <table>
                <thead>
                  <tr>
                    <th className="col-c sno-col">S. No.</th>
                    <th className="tariff-name-col">Particulars</th>
                    <th className="num">Discount Amt</th>
                    <th className="num">Net Amt</th>
                    <th className="col-c">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedLines.map((row, index) => (
                    <tr key={row.group}>
                      <td className="col-c cell-muted sno-col">{index + 1}</td>
                      <td>
                        <strong>{row.group}</strong>
                      </td>
                      <td className="num mono">₹{money(row.discount)}</td>
                      <td className="num amount-cell mono">
                        ₹{money(row.net)}
                      </td>
                      <td className="col-c">
                        <button
                          className="plain-icon"
                          onClick={() => onDetails(row.lines)}
                          aria-label={`View tariff details for ${row.group}`}
                          title="View tariff details"
                        >
                          <Icon name="info" size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th className="col-c sno-col">S. No.</th>
                    <th className="tariff-name-col">Tariff Name</th>
                    <th className="num">Rate / Unit</th>
                    <th className="num">Qty</th>
                    <th className="num">Discount %</th>
                    <th className="num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr key={line.key}>
                      <td className="col-c cell-muted sno-col">{index + 1}</td>
                      <td>
                        <strong>{line.name}</strong>
                      </td>
                      <td className="num mono">₹{money(line.rate)}</td>
                      <td className="num mono">{line.qty}</td>
                      <td className="num mono">
                        {money(lineDiscountPercent(line))}%
                      </td>
                      <td className="num amount-cell mono">
                        ₹{money(lineNet(line))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!lines.length && (
              <div className="empty-state">
                <Icon name="receipt" size={22} />
                <strong>No Tariff Details Available</strong>
                <span>
                  The server did not return tariff lines for this settlement.
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Settlement's amount is a derived, read-only total — one prominent
        readout, not an editable field echoed a second time right next to it.
        Every other workflow keeps the single editable amount input. */}
      <div className="account-amount-row">
        {isSettlement ? (
          <div className="account-amount-total">
            <span>Settlement Amount</span>
            <strong className="mono">₹{money(total)}</strong>
          </div>
        ) : (
          <TextField
            label={isRefund ? "Amount to Refund" : `${workflow.label} Amount`}
            value={amount}
            onChange={(value) =>
              setAmount(
                Math.max(0, Number(String(value).replace(/[^\d.]/g, "")) || 0),
              )
            }
            suffix="₹"
            required
            inputMode="decimal"
          />
        )}
        {onPay && (
          <button
            type="button"
            className="button button-primary account-pay-button"
            onClick={onPay}
            disabled={total <= 0}
          >
            Proceed
          </button>
        )}
      </div>
    </section>
  );
}

export { AccountWorkflowBuilder };
