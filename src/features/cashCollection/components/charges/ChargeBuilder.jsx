import React, { useEffect, useState } from "react";
import { WorkflowFamily } from "../../../../contracts/cashCollection.contract";
import { useAppData } from "../../../../app/providers/AppDataProvider";
import { useSort, applySort } from "../../../../shared/hooks/useSort";
import { money } from "../../../../shared/utils/formatters";
import {
  lineGross,
  lineDiscountAmount,
  lineNet,
} from "../../model/chargeCalculations";
import { Icon } from "../../../../shared/components/Icon";
import { SortHeader } from "../../../../shared/components/ui";
import { SelectField } from "../../../../shared/components/FormFields";

function ChargeBuilder({
  lines,
  setLines,
  requestType,
  mode,
  workflow,
  onDetails,
}) {
  const { tariffCatalog, tariffGroups } = useAppData();
  const [chargeSort, toggleChargeSort] = useSort();
  const [group, setGroup] = useState("All groups");
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const isRefund = requestType === "Refund";
  const isEstimate = requestType === "Estimation";
  const isRequest = mode === "request";
  const term = query.trim().toLowerCase();
  const matches = term
    ? tariffCatalog
        .filter(
          (tariff) =>
            (group === "All groups" || tariff.group === group) &&
            `${tariff.code} ${tariff.name}`.toLowerCase().includes(term),
        )
        .slice(0, 6)
    : [];
  useEffect(() => setHighlight(0), [term]);

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
            options={tariffGroups}
          />
          <div className="tariff-search">
            <Icon name="search" size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder="Enter tariff code or name to add a charge"
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
                    No tariff matches that code or name in {group}.
                  </div>
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
          <strong className="mono">
            ₹{money(Math.max(0, gross - discount))}
          </strong>
        </div>
      </div>
    </section>
  );
}

export { ChargeBuilder };
