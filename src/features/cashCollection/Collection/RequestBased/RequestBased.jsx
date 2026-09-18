import React, { useMemo, useState } from "react";
import { ALL_HOSPITAL_SERVICES, ALL_REQUEST_TYPES } from "./requestBased";
import "./RequestBased.css";
import { useAppData } from "../../../../app/providers/AppDataProvider";
import { useEscapeToClose } from "../../../../shared/hooks/useEscapeToClose";
import { compactIdentifier } from "../../../../shared/utils/formatters";
import { isRefundRequest } from "../../model/workflowRoutes";
import { Icon } from "../../../../shared/components/Icon";
import {
  Button,
  SortHeader,
  SkeletonRows,
  Pagination,
} from "../../../../shared/components/ui";
import { SelectField } from "../../../../shared/components/FormFields";

function ModeTabs({ mode, onChange, filteredCount }) {
  const { requests, queueSummary } = useAppData();
  const pendingCount = Number(
    filteredCount ?? queueSummary?.pendingCount ?? requests.length,
  );
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

function RequestWorklist({
  onCollect,
  search,
  setSearch,
  services,
  page,
  setPage,
  sort,
  toggleSort,
  hospitalServiceFilter,
  setHospitalServiceFilter,
  requestTypeFilter,
  setRequestTypeFilter,
  onTotalChange,
}) {
  const { requests, queueSummary } = useAppData();
  const localPage = useMemo(
    () =>
      services?.getPendingRequestPageSync?.({
        page: page - 1,
        size: 10,
        search: search.trim(),
        hospitalService:
          hospitalServiceFilter === ALL_HOSPITAL_SERVICES
            ? undefined
            : hospitalServiceFilter,
        requestType:
          requestTypeFilter === ALL_REQUEST_TYPES
            ? undefined
            : requestTypeFilter,
        sort: sort ? `${sort.field},${sort.dir}` : undefined,
      }),
    [services, page, search, hospitalServiceFilter, requestTypeFilter, sort],
  );
  const [pageData, setPageData] = useState({
    items: requests.slice(0, 10),
    total: Number(queueSummary?.pendingCount ?? requests.length),
  });
  const displayedData = localPage || pageData;
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(!localPage);
  const [filterOpen, setFilterOpen] = useState(false);
  useEscapeToClose(() => setFilterOpen(false), filterOpen);
  const pageSize = 10;
  const hospitalServiceOptions = useMemo(
    () => [
      ALL_HOSPITAL_SERVICES,
      ...Array.from(new Set(requests.map((item) => item.hospitalService)))
        .filter(Boolean)
        .sort(),
    ],
    [requests],
  );
  const requestTypeOptions = useMemo(
    () => [
      ALL_REQUEST_TYPES,
      ...Array.from(new Set(requests.map((item) => item.requestType)))
        .filter(Boolean)
        .sort(),
    ],
    [requests],
  );
  const activeFilters =
    (hospitalServiceFilter !== ALL_HOSPITAL_SERVICES ? 1 : 0) +
    (requestTypeFilter !== ALL_REQUEST_TYPES ? 1 : 0);
  React.useEffect(() => {
    if (localPage) {
      setLoading(false);
      setLoadError("");
      onTotalChange?.(localPage.total);
      return;
    }
    let active = true;
    setLoading(true);
    const timer = window.setTimeout(
      async () => {
        try {
          const result = await services.listPendingRequests({
            page: page - 1,
            size: pageSize,
            search: search.trim(),
            hospitalService:
              hospitalServiceFilter === ALL_HOSPITAL_SERVICES
                ? undefined
                : hospitalServiceFilter,
            requestType:
              requestTypeFilter === ALL_REQUEST_TYPES
                ? undefined
                : requestTypeFilter,
            sort: sort ? `${sort.field},${sort.dir}` : undefined,
          });
          if (active) {
            setPageData({
              items: result?.items || [],
              total: Number(result?.total || 0),
            });
            setLoadError("");
            onTotalChange?.(Number(result?.total || 0));
          }
        } catch (error) {
          if (active)
            setLoadError(
              error?.message || "Pending requests could not be loaded.",
            );
        } finally {
          if (active) setLoading(false);
        }
      },
      search.trim() ? 150 : 0,
    );
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [
    services,
    page,
    search,
    hospitalServiceFilter,
    requestTypeFilter,
    sort,
    onTotalChange,
    localPage,
  ]);
  const applyFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };
  const clearFilters = () => {
    setHospitalServiceFilter(ALL_HOSPITAL_SERVICES);
    setRequestTypeFilter(ALL_REQUEST_TYPES);
    setPage(1);
  };
  const pageCount = Math.max(1, Math.ceil(displayedData.total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = displayedData.items;
  // The skeleton should be exactly as tall as the table it's standing in
  // for — on the last page of any list, that's fewer than a full pageSize —
  // using the last-known total (already loaded once) as the best estimate
  // avoids a layout jump when the real rows replace the placeholders.
  const skeletonRowCount = Math.max(
    1,
    Math.min(
      pageSize,
      displayedData.total - (currentPage - 1) * pageSize || pageSize,
    ),
  );
  const changeSearch = (value) => {
    setSearch(value);
    setPage(1);
  };
  return (
    <section className="panel worklist-panel">
      <div className="panel-header worklist-header">
        <div>
          <h2 className="tariff-details-title pending-details-title">
            <span className="tariff-title-icon pending-title-icon">
              <Icon name="clock" size={16} />
            </span>
            Pending Requests
          </h2>
        </div>
        <div className="worklist-tools">
          <div className="search-field compact worklist-search">
            <Icon name="search" size={15} />
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
                    label="Hospital Service"
                    value={hospitalServiceFilter}
                    onChange={applyFilter(setHospitalServiceFilter)}
                    options={hospitalServiceOptions}
                  />
                  <SelectField
                    label="Request Type"
                    value={requestTypeFilter}
                    onChange={applyFilter(setRequestTypeFilter)}
                    options={requestTypeOptions}
                  />
                  <div className="filter-panel-foot">
                    <button className="text-button" onClick={clearFilters}>
                      Clear Filters
                    </button>
                    <span>{displayedData.total} matching</span>
                  </div>
                </div>
              </>
            )}
          </div>
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
              <th className="col-c">CR No.</th>
              <th className="col-c">Hospital Service</th>
              <th>Request Type</th>
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
            {loading && <SkeletonRows rows={skeletonRowCount} cols={8} />}
            {!loading &&
              visible.map((request) => (
                <tr
                  key={request.id}
                  className={
                    isRefundRequest(request) ? "row-refund" : "row-collect"
                  }
                >
                  <td className="col-c">
                    <span className="request-id">
                      {compactIdentifier(request.id)}
                    </span>
                  </td>
                  <td className="col-c cell-muted">{request.date}</td>
                  <td>
                    <strong>{request.patient}</strong>
                  </td>
                  <td className="col-c mono">
                    {compactIdentifier(request.cr)}
                  </td>
                  <td className="col-c cell-muted">
                    {request.hospitalService}
                  </td>
                  <td>
                    <span className="type-label">
                      {request.requestTypeLabel || request.requestType}
                    </span>
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
        {!loading && !displayedData.total && !loadError && (
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
      {!loading && displayedData.total > 0 && (
        <div className="table-pagination">
          <span>
            Showing {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, displayedData.total)} of{" "}
            {displayedData.total}
          </span>
          <Pagination
            page={currentPage}
            pageCount={pageCount}
            onChange={setPage}
          />
        </div>
      )}
    </section>
  );
}

export { ModeTabs, RequestWorklist, ALL_HOSPITAL_SERVICES, ALL_REQUEST_TYPES };
