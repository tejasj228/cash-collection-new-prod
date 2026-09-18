import React, { useEffect, useMemo, useState } from "react";
import "./BillingDetails.css";
import { WorkflowFamily } from "../../../../contracts/cashCollection.contract";
import { TariffPicker } from "./TariffPicker.jsx";
import { useAppData } from "../../../../app/providers/AppDataProvider";
import { useSort, applySort } from "../../../../shared/hooks/useSort";
import { useEscapeToClose } from "../../../../shared/hooks/useEscapeToClose";
import { useModalClose } from "../../../../shared/hooks/useModalClose";
import {
  compactIdentifier,
  firstContextValue,
  money,
} from "../../../../shared/utils/formatters";
import {
  lineGross,
  lineDiscountPercent,
  lineDiscountAmount,
  lineNet,
} from "../../model/chargeCalculations";
import { Icon } from "../../../../shared/components/Icon";
import { SortHeader } from "../../../../shared/components/ui";
import {
  SelectField,
  TextField,
} from "../../../../shared/components/FormFields";

function ChargeBuilder({
  lines,
  setLines,
  requestType,
  mode,
  workflow,
  onDetails,
  onPay,
  services,
  tariffContext,
  onPickerVisibilityChange,
}) {
  const { tariffCatalog, tariffGroups } = useAppData();
  const [chargeSort, toggleChargeSort] = useSort();
  const [group, setGroup] = useState("All groups");
  const [remoteGroups, setRemoteGroups] = useState([]);
  const groupOptions = useMemo(
    () => [
      "All groups",
      ...Array.from(
        new Set(
          (services ? remoteGroups : tariffGroups || []).filter(
            (name) => name && name !== "All groups",
          ),
        ),
      ),
    ],
    [services, remoteGroups, tariffGroups],
  );
  const pickerContext = useMemo(
    () => ({
      ...tariffContext,
      groupId: group === "All groups" ? undefined : group,
    }),
    [tariffContext, group],
  );
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [remoteTariffs, setRemoteTariffs] = useState([]);
  const [remoteTotal, setRemoteTotal] = useState(0);
  const [catalogueError, setCatalogueError] = useState("");
  const [catalogueLoading, setCatalogueLoading] = useState(false);
  const isRefund = requestType === "Refund";
  const isEstimate = requestType === "Estimation";
  const isRequest = mode === "request";
  const term = query.trim().toLowerCase();
  useEffect(() => {
    let active = true;
    setRemoteGroups([]);
    setGroup("All groups");
    if (!isRequest && services?.getTariffGroups) {
      services
        .getTariffGroups(tariffContext)
        .then((groups) => {
          if (active) setRemoteGroups(groups);
        })
        .catch((error) => {
          if (active) setCatalogueError(error.message);
        });
    }
    return () => {
      active = false;
    };
  }, [services, tariffContext, isRequest]);
  useEffect(() => {
    if (isRequest || isRefund || !services?.preloadTariffs) return;
    // Begin the shared request before the operator opens the picker or types.
    // A failed warmup remains retryable; the picker reports request errors.
    void services.preloadTariffs(tariffContext).catch(() => {});
  }, [services, tariffContext, isRequest, isRefund]);
  const matches = term
    ? (services ? remoteTariffs : tariffCatalog)
        .filter(
          (tariff) =>
            (group === "All groups" || tariff.group === group) &&
            (tariff.code.toLowerCase().startsWith(term) ||
              tariff.name.toLowerCase().startsWith(term)),
        )
        .slice(0, 10)
    : [];
  useEffect(() => setHighlight(0), [term]);
  useEffect(() => {
    onPickerVisibilityChange?.(pickerOpen);
    return () => onPickerVisibilityChange?.(false);
  }, [pickerOpen, onPickerVisibilityChange]);
  useEffect(() => {
    if (!services || !term || isRefund || isEstimate) return undefined;
    let active = true;
    setRemoteTariffs([]);
    setRemoteTotal(0);
    setCatalogueError("");
    setCatalogueLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        if (typeof services.getTariffPage !== "function")
          throw new Error("Database tariff search is unavailable.");
        const data = await services.getTariffPage({
          ...tariffContext,
          search: term,
          groupId: group === "All groups" ? undefined : group,
          page: 0,
          size: 10,
        });
        if (active) {
          setRemoteTariffs(data.items);
          setRemoteTotal(data.total);
        }
      } catch (error) {
        if (active) setCatalogueError(error.message);
      } finally {
        if (active) setCatalogueLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [services, tariffContext, term, group, isRefund, isEstimate]);

  const update = (key, patch) =>
    setLines(
      lines.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  const remove = (key) => setLines(lines.filter((line) => line.key !== key));
  const addTariff = (tariff) => {
    const existing = lines.find(
      (line) => line.code === tariff.code && line.source === "manual",
    );
    if (existing) update(existing.key, { qty: Number(existing.qty) + 1 });
    else
      setLines([
        ...lines,
        {
          ...tariff,
          qty: 1,
          discount: 0,
          key: `${tariff.code}-${Date.now()}`,
          source: "manual",
          selected: true,
        },
      ]);
    setQuery("");
  };
  const onSearchKeyDown = (event) => {
    if (event.key === "Enter" && !term) {
      event.preventDefault();
      setPickerOpen(true);
      return;
    }
    if (!matches.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((index) => (index + 1) % matches.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((index) => (index - 1 + matches.length) % matches.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      addTariff(matches[highlight] || matches[0]);
    } else if (event.key === "Escape") {
      setQuery("");
    }
  };

  const chosen = lines.filter((line) => line.selected);
  const gross = chosen.reduce((sum, line) => sum + lineGross(line), 0);
  const discount = chosen.reduce(
    (sum, line) => sum + lineDiscountAmount(line),
    0,
  );
  const allChosen = lines.length > 0 && chosen.length === lines.length;
  const toggleAll = () =>
    setLines(lines.map((line) => ({ ...line, selected: !allChosen })));

  return (
    <section className="panel charges-panel">
      <div className="panel-header">
        <div>
          <h2 className="tariff-details-title">
            <span className="tariff-title-icon">
              <Icon name="receipt" size={16} />
            </span>
            {[
              WorkflowFamily.PACKAGE_ENTRY,
              WorkflowFamily.PACKAGE_REFUND,
            ].includes(workflow?.uiFamily)
              ? `${isRefund ? "Package Refund Tariff Details" : isEstimate ? "Package Estimate Tariff Details" : "Package Tariff Details"}`
              : isEstimate
                ? "Estimated Tariff Details"
                : isRefund
                  ? "Refund Tariff Details"
                  : "Tariff Details"}{" "}
            <span className="muted-count">{lines.length}</span>
          </h2>
        </div>
      </div>

      {!isRequest && (
        <div className="tariff-bar">
          <SelectField
            className="tariff-group-select"
            ariaLabel="Tariff group"
            value={group}
            onChange={setGroup}
            options={groupOptions}
          />
          <div
            className="tariff-search"
            onClick={(event) => {
              if (!event.target.closest("button, input, .tariff-results"))
                event.currentTarget.querySelector("input")?.focus();
            }}
          >
            <Icon name="search" size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder="Enter tariff code or name to add tariff"
              aria-label="Add a Tariff"
              role="combobox"
              aria-expanded={Boolean(term)}
              aria-controls={term ? "tariff-results-listbox" : undefined}
              aria-activedescendant={
                term && matches[highlight]
                  ? `tariff-option-${matches[highlight].code}`
                  : undefined
              }
            />
            {Boolean(query) && (
              <button
                className="plain-icon"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                <Icon name="close" size={15} />
              </button>
            )}
            {Boolean(term) && (
              <div
                id="tariff-results-listbox"
                className="tariff-results"
                role="listbox"
              >
                {matches.map((tariff, index) => (
                  <button
                    key={tariff.code}
                    id={`tariff-option-${tariff.code}`}
                    role="option"
                    aria-selected={index === highlight}
                    className={index === highlight ? "active" : ""}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => addTariff(tariff)}
                  >
                    <span className="tariff-code">{tariff.code}</span>
                    <span className="tariff-name">{tariff.name}</span>
                    <span className="tariff-group-tag">{tariff.group}</span>
                    <strong className="mono">₹{money(tariff.rate)}</strong>
                  </button>
                ))}
                {!matches.length && (
                  <div className="no-results">
                    {catalogueLoading
                      ? "Loading tariffs…"
                      : catalogueError ||
                        `No tariff matches that code or name in ${group}.`}
                  </div>
                )}
                {!catalogueLoading && remoteTotal > matches.length && (
                  <button
                    className="tariff-view-all"
                    role="option"
                    aria-selected={false}
                    onClick={() => setPickerOpen(true)}
                  >
                    View all {remoteTotal} matching tariffs
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="table-wrap charge-table">
        <table>
          <thead>
            <tr>
              <th className="tick-col">
                <input
                  type="checkbox"
                  checked={allChosen}
                  onChange={toggleAll}
                  aria-label="Select all charges"
                />
              </th>
              <th className="col-c">S. No.</th>
              <th>Tariff Name</th>
              <th>Group Name</th>
              <th className="num">Rate / Unit</th>
              <th className="num">Qty</th>
              <th className="num">Disc. (%)</th>
              <SortHeader
                label="Amount"
                field="amount"
                sort={chargeSort}
                onToggle={toggleChargeSort}
              />
              {onDetails && <th className="col-c">Details</th>}
              <th aria-label="Action" />
            </tr>
          </thead>
          <tbody>
            {applySort(lines, chargeSort, {
              amount: (line) => lineNet(line),
            }).map((line, index) => (
              <tr
                key={line.key}
                className={line.selected ? "" : "row-unselected"}
              >
                <td className="tick-col">
                  <input
                    type="checkbox"
                    checked={Boolean(line.selected)}
                    onChange={() =>
                      update(line.key, { selected: !line.selected })
                    }
                    aria-label={`Include ${line.name}`}
                  />
                </td>
                <td className="col-c cell-muted">{index + 1}</td>
                <td>
                  <strong>{line.name}</strong>
                </td>
                <td>{line.group || "—"}</td>
                <td className="num mono">{money(line.rate)}</td>
                <td className="num">
                  <input
                    className="cell-input"
                    type="text"
                    inputMode="numeric"
                    value={line.qty}
                    onChange={(event) =>
                      update(line.key, {
                        qty: Math.max(
                          1,
                          Number(
                            event.target.value.replace(/\D/g, "").slice(0, 3),
                          ) || 1,
                        ),
                      })
                    }
                    aria-label={`Quantity for ${line.name}`}
                  />
                </td>
                <td className="num">
                  <input
                    className="cell-input discount-input"
                    type="text"
                    inputMode="decimal"
                    value={line.discount}
                    onChange={(event) => {
                      const clean = event.target.value
                        .replace(/[^\d.]/g, "")
                        .replace(/(\..*)\./g, "$1")
                        .slice(0, 6);
                      update(line.key, {
                        discount: Math.min(
                          100,
                          Math.max(0, Number(clean) || 0),
                        ),
                      });
                    }}
                    aria-label={`Discount percentage for ${line.name}`}
                  />
                </td>
                <td className="num amount-cell mono">
                  ₹{money(lineNet(line))}
                </td>
                {onDetails && (
                  <td className="col-c">
                    <button
                      className="plain-icon"
                      onClick={() => onDetails(line)}
                      aria-label={`View details for ${line.name}`}
                      title="View tariff details"
                    >
                      <Icon name="info" size={15} />
                    </button>
                  </td>
                )}
                <td className="action-cell">
                  {line.source === "manual" ? (
                    <button
                      className="plain-icon danger"
                      onClick={() => remove(line.key)}
                      aria-label={`Remove ${line.name}`}
                    >
                      <Icon name="close" size={15} />
                    </button>
                  ) : (
                    <span
                      className="locked-tag"
                      title="Raised by the billing request — cannot be removed here"
                    >
                      <Icon name="lock" size={12} />
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!lines.length && (
          <div className="empty-state">
            <Icon name="receipt" size={22} />
            <strong>No Tariffs Added Yet</strong>
            <span>Search a tariff code or name above to build this bill.</span>
          </div>
        )}
      </div>

      <div className="charge-summary">
        {discount > 0 && (
          <div className="summary-group">
            <div>
              <span>Gross Tariff</span>
              <strong className="mono">₹{money(gross)}</strong>
            </div>
            <div className="credit">
              <span>Discount</span>
              <strong className="mono">− ₹{money(discount)}</strong>
            </div>
          </div>
        )}
        <div className="charge-hero">
          <span>
            {isEstimate
              ? "Estimated Total"
              : isRefund
                ? "Amount to Refund"
                : "Amount to Collect"}
            {chosen.length !== lines.length && (
              <em>
                {chosen.length} of {lines.length} selected
              </em>
            )}
          </span>
          <span className="charge-hero-amount">
            <strong className="mono">
              ₹{money(Math.max(0, gross - discount))}
            </strong>
            {onPay && (
              <button
                type="button"
                className="button button-primary charge-pay-button"
                onClick={onPay}
                disabled={!isEstimate && Math.max(0, gross - discount) <= 0}
              >
                {isEstimate ? "Continue" : "Proceed"}
              </button>
            )}
          </span>
        </div>
      </div>
      {pickerOpen && (
        <TariffPicker
          initialQuery={query}
          services={services}
          context={pickerContext}
          onClose={() => setPickerOpen(false)}
          onAdd={(tariffs) =>
            setLines((current) => {
              const next = [...current];
              for (const tariff of tariffs) {
                const index = next.findIndex(
                  (line) =>
                    line.code === tariff.code && line.source === "manual",
                );
                if (index >= 0)
                  next[index] = {
                    ...next[index],
                    qty: Number(next[index].qty) + 1,
                  };
                else
                  next.push({
                    ...tariff,
                    qty: 1,
                    discount: 0,
                    key: `${tariff.code}-${Date.now()}-${next.length}`,
                    source: "manual",
                    selected: true,
                  });
              }
              return next;
            })
          }
        />
      )}
    </section>
  );
}

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
  onDetails,
  onPay,
}) {
  const context = workflowContext || {};
  const isSettlement = [
    WorkflowFamily.BILL_SETTLEMENT,
    WorkflowFamily.BILL_SETTLEMENT_REFUND,
  ].includes(workflow.uiFamily);
  const isRefund = requestType === "Refund";
  // Each of these is fixed by the patient's episode — the backend only ever
  // returns one value — so they are shown read-only rather than as pickers.
  const select = (key, values, fallback, label) => (
    <TextField
      label={label}
      value={
        selections[key] ||
        firstContextValue(values, fallback) ||
        "Not available"
      }
      onChange={() => {}}
      readOnly
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

function TariffDetailsDialog({ lines, context, onCancel }) {
  const { closing, requestClose } = useModalClose(onCancel);
  useEscapeToClose(requestClose);
  return (
    <div
      className="popover-backdrop"
      data-closing={closing || undefined}
      onMouseDown={requestClose}
    >
      <div
        className="confirm-dialog tariff-details-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tariff-details-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="confirm-head">
          <strong id="tariff-details-title">Tariff Details</strong>
          <button
            className="plain-icon"
            onClick={requestClose}
            aria-label="Close"
          >
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
                <th>Department</th>
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
                  <td className="cell-muted">{context.department || "—"}</td>
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
          <button className="link-button" onClick={requestClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export { AccountWorkflowBuilder, ChargeBuilder, TariffDetailsDialog };
