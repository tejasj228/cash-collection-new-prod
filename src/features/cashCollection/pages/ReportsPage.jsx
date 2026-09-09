import React, { useEffect, useRef, useState } from "react";
import { Icon } from "../../../shared/components/Icon";
import { SortHeader, Loader } from "../../../shared/components/ui";
import { applySort, useSort } from "../../../shared/hooks/useSort";
import { useFakeLoad } from "../../../shared/hooks/useFakeLoad";
import { formatDateInput, isoFromDisplayDate } from "../model/reportDates";
import "../../../styles/reports.css";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const amountOf = (value) => Number(String(value).replaceAll(",", ""));
const compactIdentifier = (value) => String(value ?? "").replace(/\s+/g, "");
const dateLabel = (iso) => {
  const [year, month, day] = String(iso).split("-");
  return year && month && day ? `${day}/${month}/${year}` : "";
};
const sum = (rows) => rows.reduce((total, row) => total + row.value, 0);
const csvCell = (value) =>
  `"${String(value)
    .replace(/^[=+@-]/, "'$&")
    .replaceAll('"', '""')}"`;

function ReportDateField({ label, value, onChange, isoValue, invalid }) {
  const pickerRef = useRef(null);
  const openPicker = () => {
    const picker = pickerRef.current;
    if (!picker) return;
    try {
      if (typeof picker.showPicker === "function") picker.showPicker();
      else picker.click();
    } catch {
      picker.click();
    }
  };
  return (
    <label>
      {label}
      <span className="report-date-control">
        <input
          className="report-date-text"
          inputMode="numeric"
          maxLength="10"
          value={value}
          onChange={(event) => onChange(formatDateInput(event.target.value))}
          placeholder="DD/MM/YYYY"
          aria-invalid={invalid}
        />
        <button
          type="button"
          className="report-calendar-button"
          onClick={openPicker}
          aria-label={`Choose ${label}`}
        >
          <Icon name="calendar" size={16} />
        </button>
        <input
          ref={pickerRef}
          className="report-native-picker"
          type="date"
          value={isoValue || ""}
          onChange={(event) => onChange(dateLabel(event.target.value))}
          tabIndex="-1"
          aria-hidden="true"
        />
      </span>
    </label>
  );
}

export default function Reports({ transactions, modes, todayIso }) {
  const loading = useFakeLoad();
  const [view, setView] = useState("collections");
  const [fromInput, setFromInput] = useState(dateLabel(todayIso));
  const [toInput, setToInput] = useState(dateLabel(todayIso));
  const [mode, setMode] = useState("All Modes");
  const [page, setPage] = useState(1);
  const [sort, toggleSort] = useSort();
  const pageSize = 10;
  const from = isoFromDisplayDate(fromInput);
  const to = isoFromDisplayDate(toInput);
  const invalid = !from || !to || from > to;
  const posted = transactions.map((row) => ({
    ...row,
    date: row.dateIso,
    value: amountOf(row.amount),
    kind: row.status === "Refunded" ? "Refund" : "Collection",
  }));
  const filteredPosted = posted.filter(
    (row) =>
      !invalid &&
      row.date >= from &&
      row.date <= to &&
      (mode === "All Modes" || mode === row.mode),
  );
  const rows = filteredPosted.filter((row) =>
    view === "refunds" ? row.kind === "Refund" : row.kind === "Collection",
  );
  const sortedRows = applySort(rows, sort, {
    date: (row) => row.date,
    amount: (row) => row.value,
  });
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = sortedRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  useEffect(() => setPage(1), [view, fromInput, toInput, mode]);
  const collections = filteredPosted.filter((row) => row.kind === "Collection");
  const refunds = filteredPosted.filter((row) => row.kind === "Refund");
  const gross = sum(collections),
    refunded = sum(refunds),
    net = gross - refunded;
  const reset = () => {
    setFromInput(dateLabel(todayIso));
    setToInput(dateLabel(todayIso));
    setMode("All Modes");
  };
  const exportCsv = () => {
    const headers = [
      "Bill No.",
      "Date",
      "Time",
      "Patient Name",
      "CR No.",
      "Payment Mode",
      "Type",
      "Signed Amount INR",
    ];
    const values = rows.map((row) => [
      compactIdentifier(row.no),
      dateLabel(row.date),
      row.time,
      row.patient,
      compactIdentifier(row.cr),
      row.mode,
      row.kind,
      (row.kind === "Refund" ? -row.value : row.value).toFixed(2),
    ]);
    const csv = [
      ["HBIMS report", "Transaction Details", fromInput, toInput],
      headers,
      ...values,
    ]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${view}-${from}-to-${to}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  if (loading)
    return (
      <div className="page-loading">
        <Loader label="Loading reports…" size={48} />
      </div>
    );
  return (
    <div className="reports-page">
      <div className="report-tabs-row">
        <div className="report-tabs" role="group" aria-label="Report type">
          {[
            ["collections", "Collections", "receipt"],
            ["refunds", "Refunds", "refund"],
          ].map(([id, label, icon]) => (
            <button
              key={id}
              aria-pressed={view === id}
              className={view === id ? "selected" : ""}
              onClick={() => setView(id)}
            >
              <Icon name={icon} size={16} />
              {label}
            </button>
          ))}
        </div>
        <div className="report-actions">
          <button
            className="button button-soft"
            onClick={() => window.print()}
            disabled={invalid || !rows.length}
          >
            <Icon name="print" size={16} />
            Print
          </button>
          <button
            className="button button-primary"
            onClick={exportCsv}
            disabled={invalid || !rows.length}
          >
            <Icon name="download" size={16} />
            Export CSV
          </button>
        </div>
      </div>
      <section className="panel report-filters" aria-label="Report filters">
        <ReportDateField
          label="From Date"
          value={fromInput}
          onChange={setFromInput}
          isoValue={from}
          invalid={!from}
        />
        <ReportDateField
          label="To Date"
          value={toInput}
          onChange={setToInput}
          isoValue={to}
          invalid={!to || Boolean(from && to && from > to)}
        />
        <label>
          Payment Mode
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value)}
          >
            {["All Modes", ...modes].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <button className="text-button" onClick={reset}>
          Reset
        </button>
        {invalid && (
          <p className="report-error" role="alert">
            Enter valid dates in DD/MM/YYYY format. The From Date cannot be
            after the To Date.
          </p>
        )}
      </section>
      <div className="report-period">
        {invalid
          ? "Check date range"
          : `${fromInput}${from !== to ? ` — ${toInput}` : ""}`}
      </div>
      <section className="report-balance" aria-label="Report totals">
        <div>
          <span>Gross Collections</span>
          <strong>{money(gross)}</strong>
        </div>
        <span className="report-operator">−</span>
        <div className="report-refund">
          <span>Refunds Issued</span>
          <strong>{money(refunded)}</strong>
        </div>
        <span className="report-operator">=</span>
        <div className="report-net">
          <span>Net Collection</span>
          <strong>{money(net)}</strong>
        </div>
      </section>
      <div className="report-analysis">
        <section className="panel report-mode-panel">
          <h2>Collection by Payment Mode</h2>
          <div className="report-mode-grid">
            {modes.map((item) => {
              const collected = sum(
                collections.filter((row) => row.mode === item),
              );
              const returned = sum(refunds.filter((row) => row.mode === item));
              return (
                <button
                  key={item}
                  className={`report-mode ${mode === item ? "selected" : ""}`}
                  onClick={() => setMode(mode === item ? "All Modes" : item)}
                  aria-pressed={mode === item}
                >
                  <span>
                    {item}
                    <Icon name="arrow" size={13} />
                  </span>
                  <strong>{money(collected - returned)}</strong>
                  <div className="report-bar">
                    <i
                      style={{
                        width: `${gross ? (collected / gross) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
      <section className="panel report-register">
        <div className="panel-header">
          <div>
            <h2 className="tariff-details-title">
              <span className="tariff-title-icon">
                <Icon name="receipt" size={16} />
              </span>
              Transaction Details{" "}
              <span className="muted-count">{rows.length}</span>
            </h2>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Patient Name</th>
                <th className="col-c">CR No.</th>
                <SortHeader
                  label="Bill No."
                  field="date"
                  sort={sort}
                  onToggle={toggleSort}
                  align="report-reference"
                />
                <SortHeader
                  label="Amount"
                  field="amount"
                  sort={sort}
                  onToggle={toggleSort}
                  align="report-number"
                />
                <th>Payment Mode</th>
                <th className="col-c">Status</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr key={row.no}>
                  <td>
                    <strong>{row.patient}</strong>
                  </td>
                  <td className="col-c mono">{compactIdentifier(row.cr)}</td>
                  <td className="report-reference">
                    <span className="request-id">
                      {compactIdentifier(row.no)}
                    </span>
                    <small>
                      {dateLabel(row.date)}
                      {row.time ? ` · ${row.time}` : ""}
                    </small>
                  </td>
                  <td
                    className={`report-number ${row.kind === "Refund" ? "report-refund-value" : ""}`}
                  >
                    {row.kind === "Refund" ? "−" : ""}
                    {money(row.value)}
                  </td>
                  <td>{row.mode}</td>
                  <td className="col-c">
                    <span
                      className={`status-pill ${row.kind === "Refund" ? "amber" : "green"}`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > 0 && (
          <div className="table-pagination">
            <span>
              Showing {(currentPage - 1) * pageSize + 1}–
              {Math.min(currentPage * pageSize, rows.length)} of {rows.length}
            </span>
            <div>
              <button
                aria-label="Previous report page"
                disabled={currentPage === 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                <Icon name="back" size={13} />
              </button>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map(
                (number) => (
                  <button
                    key={number}
                    className={currentPage === number ? "active" : ""}
                    aria-current={currentPage === number ? "page" : undefined}
                    onClick={() => setPage(number)}
                  >
                    {number}
                  </button>
                ),
              )}
              <button
                aria-label="Next report page"
                disabled={currentPage === pageCount}
                onClick={() =>
                  setPage((value) => Math.min(pageCount, value + 1))
                }
              >
                <Icon name="arrow" size={13} />
              </button>
            </div>
          </div>
        )}
        {rows.length === 0 && (
          <div className="empty-state">
            <Icon name="search" size={24} />
            <strong>
              {invalid ? "Select a Valid Date Range" : "No Matching Records"}
            </strong>
            <span>
              {invalid
                ? "Correct the dates above to view this report."
                : "No transactions match the selected date range and payment mode."}
            </span>
            <button className="text-button" onClick={reset}>
              Reset Filters
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
