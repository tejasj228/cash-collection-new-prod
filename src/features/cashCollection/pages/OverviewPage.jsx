import React, { useMemo, useState } from "react";
import { useAppData } from "../../../app/providers/AppDataProvider";
import { useSort, applySort } from "../../../shared/hooks/useSort";
import { useFakeLoad } from "../../../shared/hooks/useFakeLoad";
import {
  amountOf,
  money,
  compactIdentifier,
} from "../../../shared/utils/formatters";
import { Icon } from "../../../shared/components/Icon";
import {
  StatusPill,
  StatCard,
  SortHeader,
  Loader,
} from "../../../shared/components/ui";

function DonutChart({ data, total, centreValue }) {
  const [active, setActive] = useState(null);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let cursor = 0;
  const segments = data.map((row) => {
    const length = (row.value / total) * circumference;
    const segment = {
      ...row,
      length,
      offset: cursor,
      share: Math.round((row.value / total) * 100),
    };
    cursor += length;
    return segment;
  });
  const shown = active
    ? segments.find((segment) => segment.mode === active)
    : null;
  return (
    <div className="donut-wrap" onMouseLeave={() => setActive(null)}>
      <svg
        className="donut"
        viewBox="0 0 140 140"
        role="img"
        aria-label={`Collection by payment mode, total ₹${total.toLocaleString("en-IN")}`}
      >
        <g transform="rotate(-90 70 70)">
          <circle className="donut-track" cx="70" cy="70" r={radius} />
          {segments.map((segment) => (
            <circle
              key={segment.mode}
              className={`donut-seg ${active && active !== segment.mode ? "dim" : ""}`}
              cx="70"
              cy="70"
              r={radius}
              style={{
                stroke: segment.color,
                strokeDasharray: `${segment.length} ${circumference - segment.length}`,
                strokeDashoffset: -segment.offset,
              }}
              onMouseEnter={() => setActive(segment.mode)}
            />
          ))}
        </g>
        <text className="donut-value" x="70" y="75">
          {shown ? `₹${shown.amount.split(".")[0]}` : centreValue}
        </text>
      </svg>
      <ul className="donut-legend">
        {segments.map((segment) => (
          <li
            key={segment.mode}
            className={active && active !== segment.mode ? "dim" : ""}
            onMouseEnter={() => setActive(segment.mode)}
          >
            <span
              className="legend-dot"
              style={{ background: segment.color }}
            />
            <span className="legend-name">{segment.mode}</span>
            <span className="legend-share">{segment.share}%</span>
            <strong className="legend-amount">₹{segment.amount}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Overview() {
  const { recentTransactions, collectionModes, todayIso } = useAppData();
  const loading = useFakeLoad();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [txSort, toggleTxSort] = useSort();
  const pageSize = 5;
  const scope = "Today";
  const rangeTransactions = useMemo(
    () =>
      [...recentTransactions]
        .filter((item) => item.dateIso === todayIso)
        .sort(
          (a, b) =>
            b.dateIso.localeCompare(a.dateIso) || b.time.localeCompare(a.time),
        ),
    [recentTransactions, todayIso],
  );
  const filteredTransactions = useMemo(
    () =>
      rangeTransactions.filter((item) =>
        compactIdentifier(item.cr).includes(query),
      ),
    [rangeTransactions, query],
  );
  const sortedTransactions = useMemo(
    () =>
      applySort(filteredTransactions, txSort, {
        date: (row) => `${row.dateIso}-${row.time}`,
        amount: (row) => amountOf(row.amount),
      }),
    [filteredTransactions, txSort],
  );
  const pageCount = Math.max(
    1,
    Math.ceil(filteredTransactions.length / pageSize),
  );
  const currentPage = Math.min(page, pageCount);
  const visibleTransactions = sortedTransactions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const collected = rangeTransactions.filter(
    (item) => item.status !== "Refunded",
  );
  const refunded = rangeTransactions.filter(
    (item) => item.status === "Refunded",
  );
  const collectedTotal = collected.reduce(
    (sum, item) => sum + amountOf(item.amount),
    0,
  );
  const refundTotal = refunded.reduce(
    (sum, item) => sum + amountOf(item.amount),
    0,
  );
  const cashRows = collected.filter((item) => item.mode === "Cash");
  const cashTotal = cashRows.reduce(
    (sum, item) => sum + amountOf(item.amount),
    0,
  );
  const donutData = collectionModes
    .map(({ mode, color }) => {
      const rows = collected.filter((item) => item.mode === mode);
      const value = rows.reduce((sum, item) => sum + amountOf(item.amount), 0);
      return { mode, value, count: rows.length, amount: money(value), color };
    })
    .filter((item) => item.value > 0);
  const changeQuery = (value) => {
    setQuery(
      String(value || "")
        .replace(/\D/g, "")
        .slice(0, 15),
    );
    setPage(1);
  };
  if (loading)
    return (
      <div className="page-loading">
        <Loader label="Loading overview…" size={48} />
      </div>
    );
  return (
    <>
      <div className="overview-summary">
        <div className="overview-side-stats overview-stats-grid">
          <StatCard
            label={`Collected · ${scope}`}
            value={`₹${money(collectedTotal)}`}
            icon="cash"
            tone="navy"
          />
          <StatCard
            label={`Refunds · ${scope}`}
            value={`₹${money(refundTotal)}`}
            icon="refund"
            tone="coral"
          />
          <StatCard
            label={`Cash Collected · ${scope}`}
            value={`₹${money(cashTotal)}`}
            icon="lock"
            tone="teal"
          />
        </div>
        <section className="panel overview-panel chart-panel">
          <div className="panel-header">
            <div>
              <h2 className="tariff-details-title mode-details-title">
                <span className="tariff-title-icon mode-title-icon">
                  <Icon name="wallet" size={16} />
                </span>
                Collection by Payment Mode · {scope}
              </h2>
            </div>
          </div>
          {collectedTotal > 0 ? (
            <DonutChart
              data={donutData}
              total={collectedTotal}
              centreValue={`₹${money(collectedTotal).split(".")[0]}`}
            />
          ) : (
            <div className="empty-state">
              <Icon name="cash" size={22} />
              <strong>No Collections</strong>
              <span>Nothing was collected in this period.</span>
            </div>
          )}
        </section>
      </div>
      <section className="panel worklist-panel overview-panel recent-panel">
        <div className="panel-header overview-recent-header">
          <div>
            <h2 className="tariff-details-title">
              <span className="tariff-title-icon">
                <Icon name="receipt" size={16} />
              </span>
              Recent Transactions{" "}
              <span className="muted-count">{filteredTransactions.length}</span>
            </h2>
          </div>
          <label className="overview-cr-search">
            <Icon name="search" size={15} />
            <input
              inputMode="numeric"
              maxLength="15"
              value={query}
              onChange={(event) => changeQuery(event.target.value)}
              placeholder="Search by CR No."
              aria-label="Search recent transactions by CR No."
            />
            {query && (
              <button
                type="button"
                className="plain-icon"
                onClick={() => changeQuery("")}
                aria-label="Clear CR search"
              >
                <Icon name="close" size={14} />
              </button>
            )}
          </label>
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
                  sort={txSort}
                  onToggle={toggleTxSort}
                  align="col-c"
                />
                <SortHeader
                  label="Amount"
                  field="amount"
                  sort={txSort}
                  onToggle={toggleTxSort}
                />
                <th>Payment Mode</th>
                <th className="col-c">Status</th>
                <th className="action-head">Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleTransactions.map((row) => (
                <tr key={row.no}>
                  <td>
                    <strong>{row.patient}</strong>
                  </td>
                  <td className="col-c mono">{compactIdentifier(row.cr)}</td>
                  <td className="col-c">
                    <span className="request-id">
                      {compactIdentifier(row.no)}
                    </span>
                    <small>{row.time}</small>
                  </td>
                  <td className="num amount-cell">₹{row.amount}</td>
                  <td>
                    <span className="type-label">{row.mode}</span>
                  </td>
                  <td className="col-c">
                    <StatusPill
                      tone={row.status === "Refunded" ? "amber" : "green"}
                    >
                      {row.status}
                    </StatusPill>
                  </td>
                  <td className="action-cell">
                    <button className="text-button">
                      Reprint <Icon name="print" size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredTransactions.length > 0 && (
          <div className="table-pagination">
            <span>
              Showing {(currentPage - 1) * pageSize + 1}–
              {Math.min(currentPage * pageSize, filteredTransactions.length)} of{" "}
              {filteredTransactions.length}
            </span>
            <div>
              <button
                aria-label="Previous transaction page"
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
                aria-label="Next transaction page"
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
        {!filteredTransactions.length && (
          <div className="empty-state">
            <Icon name="search" size={22} />
            <strong>No Matching Transactions</strong>
            <span>
              Check the CR No. There are no matching transactions from today.
            </span>
          </div>
        )}
      </section>
    </>
  );
}

export { Overview };
