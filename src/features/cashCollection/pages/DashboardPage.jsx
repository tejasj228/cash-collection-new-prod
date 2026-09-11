import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAppData } from "../../../app/providers/AppDataProvider";
import { useSort, applySort } from "../../../shared/hooks/useSort";
import { useFakeLoad } from "../../../shared/hooks/useFakeLoad";
import { compactIdentifier, money } from "../../../shared/utils/formatters";
import { Icon } from "../../../shared/components/Icon";
import {
  CountUp,
  Loader,
  SortHeader,
  StatCard,
} from "../../../shared/components/ui";
import { ConfirmModal } from "../../../shared/components/ConfirmModal";
import {
  BILLING_SERVICES_BY_FAMILY,
  HOSPITAL_SERVICE_FAMILIES,
} from "../../../contracts/cashCollection.contract";
import { DonutChart } from "../components/dashboard/DonutChart";
import { MiniPie } from "../components/dashboard/MiniPie";
import {
  computeShiftSummary,
  hourLabel,
  hourOf,
  hourShort,
  parseAmount,
} from "../model/shiftSummary";
import "../../../styles/reports.css";

const rupee = (value) => `₹${money(value)}`;
const rupee0 = (value) => `₹${Math.round(value).toLocaleString("en-IN")}`;
const csvCell = (value) =>
  `"${String(value)
    .replace(/^[=+@-]/, "'$&")
    .replaceAll('"', '""')}"`;

const STATUS_TONE = {
  Completed: "green",
  Refunded: "amber",
  Cancelled: "grey",
  Failed: "red",
  Unposted: "amber",
};
// The table's "Bill Type" pill reads as a clerk would say it aloud — a
// completed bill is a "Receipt" — without touching the underlying status
// value every filter/summary computation already keys off.
const STATUS_LABEL = {
  Completed: "Receipt",
  Refunded: "Refunded",
  Cancelled: "Cancelled",
  Failed: "Failed",
  Unposted: "Unposted",
};

const DIMENSION_LABEL = {
  mode: "Mode",
  status: "Status",
  hour: "Hour",
  category: "Patient Category",
  department: "Group",
  service: "Billing Service Type",
};
// A `service` filter value is `${kind}::${family}` (every billing service in
// that family) or `${kind}::${family}::${billingService}` (one specific
// service) — kind is "collect" or "refund" (the two request-type cards track
// independent selections, and "IPD Advance" alone would be ambiguous between
// them). `service` is left undefined for a family-only selection.
const parseServiceFilter = (value) => {
  if (!value) return null;
  const [kind, family, service] = String(value).split("::");
  return { kind, family, service: service || null };
};
const buildServiceFilter = (kind, family, service) =>
  service ? `${kind}::${family}::${service}` : `${kind}::${family}`;
const formatServiceFilter = ({ kind, family, service }) =>
  `${family}${service ? ` · ${service}` : ""} · ${kind === "refund" ? "Refunded" : "Collected"}`;

// A muted, distinct palette for the segment pies.
const SEGMENT_COLORS = [
  "#3f8fe0",
  "#f0a94e",
  "#5bc0a8",
  "#a17bd4",
  "#e8737a",
  "#7d97b8",
  "#4bb3d8",
  "#d487b7",
  "#7fb069",
  "#e18f5b",
  "#6574c4",
  "#9b8c6b",
  "#55a6a0",
  "#c66c7f",
];
// "Cash Refunded by Billing Service Type" tracks OPD and Emergency only — IPD
// refunds aren't broken out on this dashboard. The underlying IPD-refund
// transactions still count everywhere else (Net Collection, Refunds KPI,
// Payment Mode/Category breakdowns) — this only narrows the one chart.
const REFUND_HOSPITAL_SERVICE_FAMILIES = HOSPITAL_SERVICE_FAMILIES.filter(
  (family) => family !== "IPD",
);
// Every (hospital service, billing service) bucket this app actually offers
// — OPD and Emergency only ever bill a generic "Service"; IPD is the only
// context with more than one option (`serviceOptions`/`billingByService`).
// Seeding every combination at 0 means a family with no activity yet (e.g.
// Emergency, until real Emergency charge data exists) still renders its tile
// instead of vanishing.
const groupByService = (rows) => {
  const grouped = new Map();
  HOSPITAL_SERVICE_FAMILIES.forEach((family) => {
    (BILLING_SERVICES_BY_FAMILY[family] || []).forEach((service) => {
      grouped.set(`${family}::${service}`, {
        family,
        service,
        count: 0,
        value: 0,
      });
    });
  });
  rows.forEach((row) => {
    const family = HOSPITAL_SERVICE_FAMILIES.includes(row.hospitalService)
      ? row.hospitalService
      : "OPD";
    const validServices = BILLING_SERVICES_BY_FAMILY[family] || ["Service"];
    const service = validServices.includes(row.billingService)
      ? row.billingService
      : "Service";
    const key = `${family}::${service}`;
    const current = grouped.get(key) || { family, service, count: 0, value: 0 };
    current.count += 1;
    current.value += parseAmount(row.amount);
    grouped.set(key, current);
  });
  return [...grouped.values()];
};

function HourBars({ buckets, selected, onSelect }) {
  const max = Math.max(1, ...buckets.map((b) => b.value));
  return (
    <div className="dash-hours">
      {buckets.map((bucket) => {
        const active = selected === bucket.hour;
        return (
          <button
            key={bucket.hour}
            type="button"
            className={`dash-hour ${active ? "picked" : ""} ${selected != null && !active ? "dim" : ""} ${bucket.value ? "" : "empty"}`}
            onClick={() => bucket.value && onSelect?.(bucket.hour)}
            title={`${hourLabel(bucket.hour)} · ${rupee(bucket.value)}`}
          >
            <span className="dash-hour-bar">
              <i style={{ height: `${(bucket.value / max) * 100}%` }} />
            </span>
            <span className="dash-hour-label">{hourShort(bucket.hour)}</span>
          </button>
        );
      })}
    </div>
  );
}

// Two levels: OPD / IPD / Emergency first, then that family's billing
// services (OPD and Emergency only ever have one — "Service" — so a click
// there selects it directly; IPD has four, so a click first applies a
// family-wide filter and drills in to let it be narrowed further). `selected`
// is `{ family, service }` (service may be null — a family-wide selection),
// already scoped to this card's own kind (collected vs refunded) and derived
// straight from the active cross-filter — not local state — so selecting in
// the *other* card (a different kind) naturally collapses this one back to
// the top level, and "back" clearing the filter naturally does the same.
function CollectionTypeTreemap({
  items,
  selected,
  onSelect,
  onClear,
  emptyLabel,
  families: familyNames = HOSPITAL_SERVICE_FAMILIES,
}) {
  const families = familyNames.map((name) => {
    const familyItems = items.filter((item) => item.family === name);
    const value = familyItems.reduce(
      (sum, item) => sum + Math.abs(Number(item.value) || 0),
      0,
    );
    const count = familyItems.reduce(
      (sum, item) => sum + (Number(item.count) || 0),
      0,
    );
    return { name, items: familyItems, value, count };
  });
  const grandTotal = families.reduce((sum, row) => sum + row.value, 0);

  if (!items.length)
    return (
      <div className="dash-chart-empty">{emptyLabel || "No collections"}</div>
    );

  const activeFamily =
    selected?.family && families.find((row) => row.name === selected.family);
  // OPD and Emergency each expose only one billing service — picking the
  // family already fully identifies the transaction, so select it outright.
  const pickFamily = (row) => {
    if (row.items.length === 1) onSelect?.(row.items[0]);
    else onSelect?.({ family: row.name, service: null });
  };

  if (!activeFamily) {
    return (
      <div
        className="collection-type-treemap"
        style={{ "--request-type-count": familyNames.length }}
      >
        {families.map((row, index) => (
          <button
            key={row.name}
            type="button"
            className={row.value ? "" : "dim"}
            disabled={!row.value}
            onClick={() => pickFamily(row)}
            title={`${row.name} · ${rupee(row.value)} · ${row.count} transactions`}
            style={{
              "--tile-color": SEGMENT_COLORS[index % SEGMENT_COLORS.length],
            }}
          >
            <span className="collection-type-value">
              <strong>
                <CountUp value={row.value} format={rupee0} duration={900} />
              </strong>
              <small>
                <CountUp
                  value={grandTotal ? (row.value / grandTotal) * 100 : 0}
                  format={(number) => `${Math.round(number)}%`}
                  duration={900}
                />
              </small>
            </span>
            <span className="collection-type-label">{row.name}</span>
            {!row.value && (
              <small className="collection-type-note">None yet</small>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="collection-type-drilldown">
      <button type="button" className="collection-type-back" onClick={onClear}>
        <Icon name="back" size={13} />
        {activeFamily.name}
      </button>
      <div
        className="collection-type-treemap"
        style={{ "--request-type-count": activeFamily.items.length || 1 }}
      >
        {activeFamily.items.map((item, index) => {
          const count = Number(item.count) || 0;
          const value = Number(item.value) || 0;
          const active = selected?.service === item.service;
          return (
            <button
              key={item.service}
              type="button"
              className={`${active ? "picked" : ""} ${selected?.service && !active ? "dim" : ""}`.trim()}
              onClick={() => {
                if (!active) return onSelect?.(item);
                // Re-clicking the active leaf steps back up to the
                // family-wide selection — unless this family only has the one
                // service anyway (OPD, Emergency), in which case there's no
                // meaningful "family, unspecified service" state to step back
                // to, so it clears outright, same as the "← family" button.
                if (activeFamily.items.length > 1)
                  onSelect?.({ family: item.family, service: null });
                else onClear?.();
              }}
              title={`${item.family} · ${item.service} · ${rupee(value)} · ${count} transactions`}
              style={{
                "--tile-color": SEGMENT_COLORS[index % SEGMENT_COLORS.length],
              }}
            >
              <span className="collection-type-value">
                <strong>
                  <CountUp value={value} format={rupee0} duration={900} />
                </strong>
                <small>
                  <CountUp
                    value={
                      activeFamily.value
                        ? (value / activeFamily.value) * 100
                        : 0
                    }
                    format={(number) => `${Math.round(number)}%`}
                    duration={900}
                  />
                </small>
              </span>
              <span className="collection-type-label">{item.service}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Dashboard({ transactions = [], onCancelBill }) {
  const { collectionModes, todayIso } = useAppData();
  const loading = useFakeLoad();
  const [filters, setFilters] = useState({
    mode: null,
    status: null,
    hour: null,
    category: null,
    department: null,
    service: null,
  });
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [txSort, toggleTxSort] = useSort();
  const [cancelTarget, setCancelTarget] = useState(null);
  const [segmentView, setSegmentView] = useState("category");
  const pageSize = 5;

  const today = useMemo(
    () =>
      transactions
        .filter((row) => row.dateIso === todayIso)
        .map((row) => {
          const family = HOSPITAL_SERVICE_FAMILIES.includes(row.hospitalService)
            ? row.hospitalService
            : "OPD";
          const validServices = BILLING_SERVICES_BY_FAMILY[family] || [
            "Service",
          ];
          const billingService = validServices.includes(row.billingService)
            ? row.billingService
            : "Service";
          return {
            ...row,
            hour: hourOf(row.time),
            // `${collect|refund}::${family}::${billingService}` — the exact
            // shape a request-type filter value takes (see parseServiceFilter).
            service: `${row.status === "Refunded" ? "refund" : "collect"}::${family}::${billingService}`,
          };
        }),
    [transactions, todayIso],
  );

  const matchesExcept = (row, skip) =>
    Object.entries(filters).every(([dim, value]) => {
      if (value == null || dim === skip) return true;
      // A `service` filter can be family-wide ("collect::IPD") — a prefix of
      // every row's own full "collect::IPD::Advance" — or fully specific;
      // startsWith covers both without a separate "family only" branch.
      if (dim === "service") return String(row.service).startsWith(value);
      return String(row[dim]) === String(value);
    });
  const view = useMemo(
    () => today.filter((row) => matchesExcept(row, null)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [today, filters],
  );

  const toggleFilter = (dim, value) => {
    setFilters((current) => ({
      ...current,
      [dim]: current[dim] === value ? null : value,
    }));
    setPage(1);
  };
  const clearFilters = () => {
    setFilters({
      mode: null,
      status: null,
      hour: null,
      category: null,
      department: null,
      service: null,
    });
    setPage(1);
  };
  // The request-type treemaps' "back" always clears the filter outright
  // (rather than toggling), so navigating up never leaves a stale selection
  // behind that resurfaces later.
  const clearServiceFilter = () => {
    setFilters((current) => ({ ...current, service: null }));
    setPage(1);
  };
  const activeChips = Object.entries(filters).filter(
    ([, value]) => value != null,
  );

  // Mirror the inline filter chips in a card in the right gutter the moment
  // they slip *behind the floating top nav* (not only when they leave the
  // viewport) — the negative top rootMargin matches the nav's occupied height.
  const inlineChipsRef = useRef(null);
  const [chipsPinned, setChipsPinned] = useState(false);
  useEffect(() => {
    const el = inlineChipsRef.current;
    if (!el || !activeChips.length) {
      setChipsPinned(false);
      return undefined;
    }
    const io = new IntersectionObserver(
      ([entry]) => setChipsPinned(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-88px 0px 0px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [activeChips.length]);

  const renderChips = () => (
    <>
      {activeChips.map(([dim, value]) => (
        <button
          key={dim}
          type="button"
          className={`dash-chip ${dim === "service" ? "dash-chip-wrap" : ""}`}
          onClick={() => toggleFilter(dim, value)}
        >
          <span>
            {DIMENSION_LABEL[dim]}:{" "}
            {dim === "hour"
              ? hourLabel(value)
              : dim === "service"
                ? formatServiceFilter(parseServiceFilter(value))
                : value}
          </span>
          <Icon name="close" size={12} />
        </button>
      ))}
      <button type="button" className="text-button" onClick={clearFilters}>
        Clear all
      </button>
    </>
  );

  const summary = useMemo(() => computeShiftSummary(view), [view]);
  const cashInDrawer = useMemo(
    () => computeShiftSummary(today).cashInDrawer,
    [today],
  );

  // Memoized so its identity only changes when the filter value itself does —
  // otherwise a fresh object every render (e.g. from the pinned-filter
  // scroll observer re-rendering the page) re-triggers the treemap's
  // selected-family sync effect and silently snaps it back into a drilled-in
  // view the operator had already navigated away from.
  const selectedService = useMemo(
    () => parseServiceFilter(filters.service),
    [filters.service],
  );
  const collectionTypeData = useMemo(() => {
    const rows = today.filter(
      (row) => row.status === "Completed" && matchesExcept(row, "service"),
    );
    return groupByService(rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, filters]);
  const refundTypeData = useMemo(() => {
    const rows = today.filter(
      (row) => row.status === "Refunded" && matchesExcept(row, "service"),
    );
    return groupByService(rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, filters]);

  // The Payment Mode / Category / Group breakdowns read as "collection and
  // refund, combined" by default. Picking a request-type tile narrows them:
  // a collection charge type shows only what was collected under it, a
  // refund charge type shows only what was refunded under it. With no
  // request-type picked, both sides fold into one net figure per bucket, so
  // it still reconciles with the Net Collection KPI.
  const requestTypeKind = !selectedService
    ? "both"
    : selectedService.kind === "refund"
      ? "refund"
      : "collection";
  const includedInBreakdown = (row) => {
    if (requestTypeKind === "collection") return row.status === "Completed";
    if (requestTypeKind === "refund") return row.status === "Refunded";
    return row.status === "Completed" || row.status === "Refunded";
  };
  // `includedInBreakdown` has already restricted rows to one status when a
  // request type is picked, so only the combined "both" view needs refunds
  // signed negative to net against collections — a refund-only or
  // collection-only view wants the plain positive magnitude, or every bucket
  // nets negative and gets dropped by the value > 0 filter below.
  const breakdownAmount = (row) => {
    if (requestTypeKind !== "both") return parseAmount(row.amount);
    return row.status === "Refunded"
      ? -parseAmount(row.amount)
      : parseAmount(row.amount);
  };
  const breakdownKindLabel =
    requestTypeKind === "collection"
      ? "Collections"
      : requestTypeKind === "refund"
        ? "Refunds"
        : "Collection / Refund";

  // Every breakdown uses the same filtered transaction set so the totals shown
  // by payment mode, category, department and hour always reconcile.
  const donutData = useMemo(() => {
    return collectionModes
      .map(({ mode, color }) => {
        const inMode = view.filter(
          (row) => row.mode === mode && includedInBreakdown(row),
        );
        const value = inMode.reduce((s, r) => s + breakdownAmount(r), 0);
        return {
          mode,
          value,
          count: inMode.length,
          amount: money(value),
          color,
        };
      })
      .filter((row) => row.value > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, collectionModes, requestTypeKind]);
  const donutTotal = donutData.reduce((s, r) => s + r.value, 0);

  // Preserve every named segment so category and department totals reconcile
  // with the payment-mode total without introducing an "Other" bucket.
  const groupCollected = (rows, key) => {
    const map = new Map();
    rows.filter(includedInBreakdown).forEach((row) => {
      const bucket = row[key] || "—";
      map.set(bucket, (map.get(bucket) || 0) + breakdownAmount(row));
    });
    const ranked = [...map.entries()]
      .map(([key2, value]) => ({ key: key2, label: key2, value }))
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value);
    return ranked.map((row, index) => ({
      ...row,
      color: SEGMENT_COLORS[index % SEGMENT_COLORS.length],
    }));
  };
  const categoryData = useMemo(
    () => groupCollected(view, "category"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view, requestTypeKind],
  );
  const departmentData = useMemo(
    () => groupCollected(view, "department"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view, requestTypeKind],
  );

  const hourBuckets = useMemo(() => {
    const rows = view.filter((row) => row.status === "Completed");
    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      value: rows
        .filter((r) => r.hour === hour)
        .reduce((s, r) => s + parseAmount(r.amount), 0),
    }));
  }, [view]);

  const filteredRows = useMemo(
    () => view.filter((row) => compactIdentifier(row.cr).includes(query)),
    [view, query],
  );
  const sortedRows = useMemo(
    () =>
      applySort(filteredRows, txSort, {
        date: (row) => `${row.dateIso}-${row.time}`,
        amount: (row) => parseAmount(row.amount),
      }),
    [filteredRows, txSort],
  );
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = sortedRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  // windowed page list (1 … n-1 n n+1 … last) so many pages stay compact
  const pageList = useMemo(() => {
    const keep = new Set([1, pageCount]);
    for (let p = currentPage - 1; p <= currentPage + 1; p += 1) {
      if (p >= 1 && p <= pageCount) keep.add(p);
    }
    const sorted = [...keep].sort((a, b) => a - b);
    return sorted.reduce((out, p, index) => {
      if (index && p - sorted[index - 1] > 1) out.push(`gap-${p}`);
      out.push(p);
      return out;
    }, []);
  }, [pageCount, currentPage]);

  const dateLabel = new Date(`${todayIso}T12:00:00`).toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );

  const exportCsv = () => {
    const headers = [
      "Bill No.",
      "Date",
      "Time",
      "Patient Name",
      "CR No.",
      "Group",
      "Category",
      "Payment Mode",
      "Status",
      "Signed Amount INR",
    ];
    const values = filteredRows.map((row) => [
      compactIdentifier(row.no),
      todayIso,
      row.time,
      row.patient,
      compactIdentifier(row.cr),
      row.department,
      row.category,
      row.mode,
      row.status,
      (row.status === "Refunded"
        ? -parseAmount(row.amount)
        : parseAmount(row.amount)
      ).toFixed(2),
    ]);
    const csv = [["HBIMS shift dashboard", dateLabel], headers, ...values]
      .map((line) => line.map(csvCell).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["﻿", csv], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `shift-${todayIso}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (loading)
    return (
      <div className="page-loading">
        <Loader label="Loading dashboard…" size={48} />
      </div>
    );

  const cancelledCount = summary.cancelCount;

  return (
    <div className="dash">
      <div className="dash-header">
        <div>
          <h1>Collection Dashboard</h1>
          <span className="dash-subtitle">{dateLabel} </span>
        </div>
        <button
          className="button button-soft report-print-btn"
          onClick={exportCsv}
        >
          <Icon name="sheet" size={15} />
          Export CSV
        </button>
      </div>

      {activeChips.length > 0 && (
        <div className="dash-filter-chips" ref={inlineChipsRef}>
          {renderChips()}
        </div>
      )}

      <div className="dash-kpis">
        <StatCard
          className="kpi-tile"
          label="Total Collected"
          countValue={summary.collectedTotal}
          formatValue={rupee}
          icon="cash"
          tone="teal"
          meta={`${summary.collectionCount} bills · Today`}
        />
        <StatCard
          className="kpi-tile"
          label="Refunds"
          countValue={summary.refundTotal}
          formatValue={rupee}
          icon="refund"
          tone="coral"
          meta={`${summary.refundCount} refunds · Today`}
        />
        <StatCard
          className="kpi-tile"
          label="Net Collection"
          countValue={summary.net}
          formatValue={rupee}
          icon="wallet"
          tone="navy"
          meta={`${summary.collectionCount} collections · ${summary.refundCount} refunds · Today`}
        />
        <StatCard
          className="kpi-tile"
          label="Cash in Drawer"
          countValue={cashInDrawer}
          formatValue={rupee}
          icon="lock"
          tone="navy"
          meta="Cash net · Today"
        />
        <StatCard
          className="kpi-tile"
          label="Receipts"
          countValue={summary.collectionCount}
          formatValue={(n) => Math.round(n).toString()}
          icon="receipt"
          tone="teal"
          meta={
            cancelledCount ? `${cancelledCount} cancelled · Today` : "Today"
          }
        />
        <StatCard
          className="kpi-tile"
          label="Refund Bills"
          countValue={summary.refundCount}
          formatValue={(n) => Math.round(n).toString()}
          icon="refund"
          tone="coral"
          meta="Today"
        />
      </div>

      <div className="dash-charts">
        <section className="panel dash-chart-card dash-card-mode">
          <div className="panel-header">
            <h2>
              <span className="tariff-title-icon">
                <Icon name="wallet" size={15} />
              </span>
              {breakdownKindLabel} by Payment Mode
            </h2>
          </div>
          {donutTotal > 0 ? (
            <DonutChart
              data={donutData}
              total={donutTotal}
              centreCount={donutTotal}
              selected={filters.mode}
              onSelect={(mode) => toggleFilter("mode", mode)}
            />
          ) : (
            <div className="empty-state">
              <Icon name="cash" size={22} />
              <strong>
                {requestTypeKind === "refund" ? "No refunds" : "No collections"}
              </strong>
            </div>
          )}
        </section>

        <section className="panel dash-chart-card dash-card-segments">
          <div className="panel-header">
            <h2>
              <span className="tariff-title-icon">
                <Icon name="layers" size={15} />
              </span>
              {breakdownKindLabel} by{" "}
              {segmentView === "category" ? "Patient Category" : "Group"}
            </h2>
            <div className="dash-seg-toggle" role="group" aria-label="Segment">
              <button
                type="button"
                className={segmentView === "category" ? "on" : ""}
                onClick={() => setSegmentView("category")}
              >
                Patient Category
              </button>
              <button
                type="button"
                className={segmentView === "department" ? "on" : ""}
                onClick={() => setSegmentView("department")}
              >
                Group
              </button>
            </div>
          </div>
          <MiniPie
            items={segmentView === "category" ? categoryData : departmentData}
            selected={
              segmentView === "category" ? filters.category : filters.department
            }
            onSelect={(value) => toggleFilter(segmentView, value)}
            emptyLabel={
              requestTypeKind === "refund" ? "No refunds" : "No collections"
            }
          />
        </section>

        <div className="dash-request-type-row">
          <section className="panel dash-chart-card dash-card-request-types">
            <div className="panel-header">
              <h2>
                <span className="tariff-title-icon">
                  <Icon name="receipt" size={15} />
                </span>
                Cash Collected by Billing Service Type
              </h2>
            </div>
            <CollectionTypeTreemap
              items={collectionTypeData}
              selected={
                selectedService?.kind === "collect" ? selectedService : null
              }
              onSelect={(item) =>
                toggleFilter(
                  "service",
                  buildServiceFilter("collect", item.family, item.service),
                )
              }
              onClear={clearServiceFilter}
            />
          </section>

          <section className="panel dash-chart-card dash-card-refund-types">
            <div className="panel-header">
              <h2>
                <span className="tariff-title-icon">
                  <Icon name="refund" size={15} />
                </span>
                Cash Refunded by Billing Service Type
              </h2>
            </div>
            <CollectionTypeTreemap
              items={refundTypeData}
              families={REFUND_HOSPITAL_SERVICE_FAMILIES}
              selected={
                selectedService?.kind === "refund" ? selectedService : null
              }
              onSelect={(item) =>
                toggleFilter(
                  "service",
                  buildServiceFilter("refund", item.family, item.service),
                )
              }
              onClear={clearServiceFilter}
              emptyLabel="No refunds"
            />
          </section>
        </div>

        <section className="panel dash-chart-card dash-card-hourly">
          <div className="panel-header">
            <h2>
              <span className="tariff-title-icon">
                <Icon name="clock" size={15} />
              </span>
              Hourly collection
            </h2>
          </div>
          {hourBuckets.length ? (
            <HourBars
              buckets={hourBuckets}
              selected={filters.hour}
              onSelect={(hour) => toggleFilter("hour", hour)}
            />
          ) : (
            <div className="empty-state">
              <Icon name="clock" size={22} />
              <strong>No collections</strong>
            </div>
          )}
        </section>
      </div>

      <section className="panel dash-table-panel">
        <div className="panel-header dash-table-header">
          <div>
            <h2 className="tariff-details-title">
              <span className="tariff-title-icon">
                <Icon name="receipt" size={16} />
              </span>
              Recent Transactions{" "}
              <span className="muted-count">{filteredRows.length}</span>
            </h2>
          </div>
          <label className="dash-table-search">
            <Icon name="search" size={15} />
            <input
              inputMode="numeric"
              maxLength="15"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value.replace(/\D/g, "").slice(0, 15));
                setPage(1);
              }}
              placeholder="Search by CR No."
              aria-label="Search transactions by CR No."
            />
            {query && (
              <button
                type="button"
                className="plain-icon"
                onClick={() => setQuery("")}
                aria-label="Clear search"
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
                <th className="col-c">Bill Type</th>
                <th className="col-c">Action 1</th>
                <th className="col-c">Action 2</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr
                  key={row.no}
                  className={
                    row.status === "Refunded"
                      ? "row-refund"
                      : row.status === "Cancelled"
                        ? "row-cancelled"
                        : "row-collect"
                  }
                >
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
                    <span className={`status-pill ${STATUS_TONE[row.status]}`}>
                      {STATUS_LABEL[row.status] || row.status}
                    </span>
                  </td>
                  <td className="col-c">
                    <button
                      type="button"
                      className="button button-soft dash-row-btn"
                    >
                      <Icon name="print" size={13} />
                      Reprint
                    </button>
                  </td>
                  <td className="col-c">
                    {row.status !== "Cancelled" && (
                      <button
                        type="button"
                        className="button dash-row-btn dash-btn-cancel"
                        onClick={() => setCancelTarget(row)}
                      >
                        Cancel bill
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredRows.length > 0 && (
          <div className="table-pagination">
            <span>
              Showing {(currentPage - 1) * pageSize + 1}–
              {Math.min(currentPage * pageSize, filteredRows.length)} of{" "}
              {filteredRows.length}
            </span>
            <div>
              <button
                aria-label="Previous page"
                disabled={currentPage === 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                <Icon name="back" size={13} />
              </button>
              {pageList.map((entry) =>
                typeof entry === "number" ? (
                  <button
                    key={entry}
                    className={currentPage === entry ? "active" : ""}
                    onClick={() => setPage(entry)}
                  >
                    {entry}
                  </button>
                ) : (
                  <span key={entry} className="table-pagination-gap">
                    …
                  </span>
                ),
              )}
              <button
                aria-label="Next page"
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
        {!filteredRows.length && (
          <div className="empty-state">
            <Icon name="search" size={22} />
            <strong>No matching transactions</strong>
            <span>Adjust the filters or CR search above.</span>
          </div>
        )}
      </section>

      {activeChips.length > 0 && chipsPinned && (
        <div
          className="dash-filter-float"
          role="region"
          aria-label="Active filters"
        >
          <span className="dash-filter-float-title">
            <Icon name="filter" size={13} /> Filters
          </span>
          <div className="dash-filter-float-chips">{renderChips()}</div>
        </div>
      )}

      {cancelTarget && (
        <ConfirmModal
          tone="danger"
          icon="close"
          title="Cancel this bill?"
          rows={[
            ["Bill No.", compactIdentifier(cancelTarget.no)],
            ["Patient", cancelTarget.patient],
            ["Amount", `₹${cancelTarget.amount}`],
            ["Payment Mode", cancelTarget.mode],
          ]}
          confirmLabel="Cancel bill"
          cancelLabel="Keep bill"
          onConfirm={() => {
            onCancelBill?.(cancelTarget.no);
            setCancelTarget(null);
          }}
          onCancel={() => setCancelTarget(null)}
        />
      )}
    </div>
  );
}
