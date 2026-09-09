import React, { useMemo, useState } from "react";
import { useAppData } from "../../../../app/providers/AppDataProvider";
import { useEscapeToClose } from "../../../../shared/hooks/useEscapeToClose";
import { useSort } from "../../../../shared/hooks/useSort";
import { compactIdentifier } from "../../../../shared/utils/formatters";
import { isRefundRequest } from "../../model/workflowRoutes";
import { Icon } from "../../../../shared/components/Icon";
import {
  Button,
  StatusPill,
  PageHeading,
  SortHeader,
  SkeletonRows,
} from "../../../../shared/components/ui";
import { SelectField } from "../../../../shared/components/FormFields";

const ALL_TYPES = "All Charge Types";

const ALL_DEPTS = "All Departments";

function ModeTabs({ mode, onChange }) {
  const { requests, queueSummary } = useAppData();
  const pendingCount = Number(queueSummary?.pendingCount ?? requests.length);
  const options = [
    {
      id: "request",
      label: "Request-Based Collection",
      icon: "receipt",
      count: pendingCount,
    },
    { id: "direct", label: "Direct Collection", icon: "cash" },
  ];
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.id === mode),
  );
  return (
    <div className="mode-switch" role="tablist" aria-label="Collection mode">
      <span
        className="mode-switch-thumb"
        aria-hidden="true"
        style={{ transform: `translateX(calc(${activeIndex} * 100%))` }}
      />
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={mode === option.id}
          className={`mode-switch-option ${mode === option.id ? "selected" : ""}`}
          onClick={() => onChange(option.id)}
        >
          <span className={`tab-icon ${option.id}`}>
            <Icon name={option.icon} size={16} />
          </span>
          <strong>{option.label}</strong>
          {option.count != null && (
            <span className="tab-count">{option.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

function RequestWorklist({ onCollect, search, setSearch, services }) {
  const { requests, queueSummary, requestFilterOptions } = useAppData();
  const [page, setPage] = useState(1);
  const [sort, toggleSort] = useSort();
  const [pageData, setPageData] = useState({
    items: requests.slice(0, 10),
    total: Number(queueSummary?.pendingCount ?? requests.length),
  });
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  useEscapeToClose(() => setFilterOpen(false), filterOpen);
  const [typeFilter, setTypeFilter] = useState(ALL_TYPES);
  const [deptFilter, setDeptFilter] = useState(ALL_DEPTS);
  const pageSize = 10;
  const typeOptions = useMemo(
    () => [
      ALL_TYPES,
      ...(requestFilterOptions?.chargeTypes ||
        Array.from(new Set(requests.map((item) => item.type))).sort()),
    ],
    [requestFilterOptions, requests],
  );
  const deptOptions = useMemo(
    () => [
      ALL_DEPTS,
      ...(requestFilterOptions?.departments ||
        Array.from(new Set(requests.map((item) => item.department))).sort()),
    ],
    [requestFilterOptions, requests],
  );
  const activeFilters =
    (typeFilter !== ALL_TYPES ? 1 : 0) + (deptFilter !== ALL_DEPTS ? 1 : 0);
  React.useEffect(() => {
    let active = true;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const result = await services.listPendingRequests({
          page: page - 1,
          size: pageSize,
          search: search.trim(),
          chargeType: typeFilter === ALL_TYPES ? undefined : typeFilter,
          department: deptFilter === ALL_DEPTS ? undefined : deptFilter,
          sort: sort ? `${sort.field},${sort.dir}` : undefined,
        });
        if (active) {
          setPageData({
            items: result?.items || [],
            total: Number(result?.total || 0),
          });
          setLoadError("");
        }
      } catch (error) {
        if (active)
          setLoadError(
            error?.message || "Pending requests could not be loaded.",
          );
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [services, page, search, typeFilter, deptFilter, sort]);
  const applyFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };
  const clearFilters = () => {
    setTypeFilter(ALL_TYPES);
    setDeptFilter(ALL_DEPTS);
    setPage(1);
  };
  const pageCount = Math.max(1, Math.ceil(pageData.total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = pageData.items;
  const changeSearch = (value) => {
    setSearch(value);
    setPage(1);
  };
  return (
    <section className="panel worklist-panel">
      <div className="panel-header">
        <div>
          <h2 className="tariff-details-title pending-details-title">
            <span className="tariff-title-icon pending-title-icon">
              <Icon name="clock" size={16} />
            </span>
            Pending Requests
          </h2>
        </div>
        <span className="page-size-note">10 per page</span>
      </div>
      <div className="table-tools">
        <div className="search-field compact">
          <Icon name="search" size={16} />
          <input
            value={search}
            onChange={(event) => changeSearch(event.target.value)}
            placeholder="Search patient, CR No. or Req No."
          />
        </div>
        <div className="filter-wrap">
          <button
            className={`filter-button ${activeFilters ? "on" : ""}`}
            aria-expanded={filterOpen}
            onClick={() => setFilterOpen((open) => !open)}
          >
            <Icon name="filter" size={15} /> Filter
            {activeFilters > 0 && <em>{activeFilters}</em>}
          </button>
          {filterOpen && (
            <>
              <div
                className="filter-backdrop"
                onMouseDown={() => setFilterOpen(false)}
              />
              <div className="filter-panel">
                <div className="filter-panel-head">
                  <strong>Filter Requests</strong>
                  <button
                    className="plain-icon"
                    onClick={() => setFilterOpen(false)}
                    aria-label="Close filters"
                  >
                    <Icon name="close" size={15} />
                  </button>
                </div>
                <SelectField
                  label="Charge Type"
                  value={typeFilter}
                  onChange={applyFilter(setTypeFilter)}
                  options={typeOptions}
                />
                <SelectField
                  label="Department"
                  value={deptFilter}
                  onChange={applyFilter(setDeptFilter)}
                  options={deptOptions}
                />
                <div className="filter-panel-foot">
                  <button className="text-button" onClick={clearFilters}>
                    Clear Filters
                  </button>
                  <span>{pageData.total} matching</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="col-c">Req No.</th>
              <SortHeader
                label="Req Date"
                field="date"
                sort={sort}
                onToggle={toggleSort}
                align="col-c"
              />
              <th>Patient Name</th>
              <th>Department</th>
              <th className="col-c">CR No.</th>
              <th>Charge Type</th>
              <SortHeader
                label="Amount"
                field="amount"
                sort={sort}
                onToggle={toggleSort}
              />
              <th className="action-head">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && <SkeletonRows rows={pageSize} cols={8} />}
            {!loading &&
              visible.map((request) => (
                <tr key={request.id}>
                  <td className="col-c">
                    <span className="request-id">
                      {compactIdentifier(request.id)}
                    </span>
                  </td>
                  <td className="col-c cell-muted">{request.date}</td>
                  <td>
                    <strong>{request.patient}</strong>
                  </td>
                  <td className="cell-muted">{request.department}</td>
                  <td className="col-c mono">
                    {compactIdentifier(request.cr)}
                  </td>
                  <td>
                    <span className="type-label">{request.type}</span>
                  </td>
                  <td className="num amount-cell">₹{request.amount}</td>
                  <td className="action-cell">
                    <Button
                      variant="soft"
                      className={
                        isRefundRequest(request)
                          ? "action-refund"
                          : "action-collect"
                      }
                      onClick={() => onCollect(request)}
                      icon="arrow"
                    >
                      {isRefundRequest(request) ? "Refund" : "Collect"}
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {loadError && (
          <div className="inline-error" role="alert">
            {loadError}
          </div>
        )}
        {!loading && !pageData.total && !loadError && (
          <div className="empty-state">
            <Icon name="search" size={22} />
            <strong>No Matching Requests</strong>
            <span>
              {activeFilters
                ? "No requests match the current filters."
                : "Try a patient name, CR No. or req no."}
            </span>
            {activeFilters > 0 && (
              <button className="text-button" onClick={clearFilters}>
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>
      {!loading && pageData.total > 0 && (
        <div className="table-pagination">
          <span>
            Showing {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, pageData.total)} of{" "}
            {pageData.total}
          </span>
          <div>
            <button
              aria-label="Previous page"
              disabled={currentPage === 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              <Icon name="back" size={13} />
            </button>
            {Array.from({ length: pageCount }, (_, index) => index + 1)
              .slice(Math.max(0, currentPage - 3), currentPage + 2)
              .map((number) => (
                <button
                  key={number}
                  className={currentPage === number ? "active" : ""}
                  aria-current={currentPage === number ? "page" : undefined}
                  onClick={() => setPage(number)}
                >
                  {number}
                </button>
              ))}
            <button
              aria-label="Next page"
              disabled={currentPage === pageCount}
              onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
            >
              <Icon name="arrow" size={13} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function DirectSelector({ onSelect, transactionType }) {
  const { serviceOptions } = useAppData();
  const isEstimate = transactionType === "Estimation";
  return (
    <div className="direct-shell">
      <div className="direct-intro">
        <div>
          <h2>
            {isEstimate
              ? "Choose a Service to Estimate"
              : "Choose a Service to Begin"}
          </h2>
          {isEstimate && (
            <p>
              An estimate calculates expected charges and can be printed, but
              does not collect money or create a receipt.
            </p>
          )}
        </div>
      </div>
      <div className="service-grid">
        {serviceOptions.map((service) => (
          <button
            key={service.id}
            className={`service-card ${service.tone}`}
            onClick={() => onSelect(service)}
            aria-label={`Select ${service.label}`}
          >
            <div className="service-card-top">
              <span className="service-icon">
                <Icon name={service.icon} size={23} />
              </span>
              <span className="service-open">
                <Icon name="arrow" size={17} />
              </span>
            </div>
            <h3>{service.label}</h3>
          </button>
        ))}
      </div>
    </div>
  );
}

function EstimatesHome({ onCreate }) {
  const { recentEstimates: estimates } = useAppData();
  return (
    <>
      <PageHeading
        title="Estimates"
        action={
          <Button onClick={onCreate} icon="plus">
            Create Estimate
          </Button>
        }
      />
      <div className="estimate-info">
        <span className="estimate-info-icon">
          <Icon name="info" size={16} />
        </span>
        <span>
          <strong>Estimates are not collections.</strong> They are a
          patient-facing tariff preview. Payment starts only when a Receipt
          transaction is confirmed.
        </span>
      </div>
      <div className="worklist-grid">
        <section className="panel worklist-panel">
          <div className="panel-header">
            <div>
              <h2>
                Recent Estimates{" "}
                <span className="muted-count">{estimates.length}</span>
              </h2>
            </div>
            <button className="text-button">
              Search Estimates <Icon name="arrow" size={14} />
            </button>
          </div>
          <div className="table-wrap estimate-table">
            <table>
              <thead>
                <tr>
                  <th>Estimate</th>
                  <th>Patient Name</th>
                  <th>CR No.</th>
                  <th>Hospital Service</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {estimates.map((estimate) => (
                  <tr key={estimate.no}>
                    <td>
                      <span className="request-id">
                        {compactIdentifier(estimate.no)}
                      </span>
                      <small>{estimate.date}</small>
                    </td>
                    <td>
                      <strong>{estimate.patient}</strong>
                    </td>
                    <td className="mono">{compactIdentifier(estimate.cr)}</td>
                    <td>
                      <span className="type-label">{estimate.service}</span>
                    </td>
                    <td className="amount-cell">{estimate.amount}</td>
                    <td>
                      <StatusPill
                        tone={estimate.status === "Draft" ? "amber" : "green"}
                      >
                        {estimate.status}
                      </StatusPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <aside className="panel side-callout estimate-callout">
          <div className="callout-orbit">
            <span className="orbit-ring ring-one" />
            <span className="orbit-ring ring-two" />
            <span className="orbit-core">
              <Icon name="receipt" size={24} />
            </span>
          </div>
          <h3>Estimate Tariff Details</h3>
          <Button onClick={onCreate} icon="arrow">
            Create Estimate
          </Button>
          <div className="callout-note">
            <Icon name="info" size={14} />
            <span>No payment method or bill number is generated.</span>
          </div>
        </aside>
      </div>
    </>
  );
}

export { ModeTabs, RequestWorklist, DirectSelector, EstimatesHome };
