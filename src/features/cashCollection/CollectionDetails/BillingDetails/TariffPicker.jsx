import React, { useEffect, useMemo, useState } from "react";
import "./BillingDetails.css";
import { Icon } from "../../../../shared/components/Icon";
import { Pagination } from "../../../../shared/components/ui";
import { useEscapeToClose } from "../../../../shared/hooks/useEscapeToClose";
import { money } from "../../../../shared/utils/formatters";

export function TariffPicker({
  services,
  context,
  onAdd,
  onClose,
  initialQuery = "",
}) {
  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState(1);
  const filters = useMemo(
    () => ({ ...context, search: query.trim(), page: page - 1, size: 10 }),
    [context, query, page],
  );
  const cachedData = useMemo(
    () => services?.peekTariffPage?.(filters),
    [services, filters],
  );
  const [data, setData] = useState({ items: [], total: 0 });
  const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const displayedData = cachedData || data;
  const busy = loading && !cachedData;
  useEscapeToClose(onClose);
  useEffect(() => {
    let active = true;
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    const timer = window.setTimeout(
      async () => {
        try {
          if (typeof services?.getTariffPage !== "function")
            throw new Error("The database tariff catalogue is unavailable.");
          const result = await services.getTariffPage(filters);
          if (active) setData(result);
        } catch (err) {
          if (active) setError(err.message || "Tariffs could not be loaded.");
        } finally {
          if (active) setLoading(false);
        }
      },
      filters.search ? 150 : 0,
    );
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [services, filters, cachedData]);
  return (
    <div className="popover-backdrop" onMouseDown={onClose}>
      <div
        className="confirm-dialog tariff-details-dialog tariff-picker-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Select tariffs"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="confirm-head">
          <strong>Select tariffs</strong>
          <button
            className="plain-icon"
            onClick={onClose}
            aria-label="Close tariffs"
          >
            ×
          </button>
        </div>
        <div
          className="search-field tariff-picker-search"
          onClick={(event) =>
            event.currentTarget.querySelector("input")?.focus()
          }
        >
          <Icon name="search" size={17} />
          <input
            type="search"
            autoFocus
            aria-label="Search tariffs"
            placeholder="Search tariff code or name"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="table-wrap" aria-busy={busy}>
          <table>
            <thead>
              <tr>
                <th>Select</th>
                <th>Tariff Code</th>
                <th>Tariff name</th>
                <th>Group Name</th>
                <th>Rate / Unit</th>
              </tr>
            </thead>
            <tbody>
              {!error &&
                displayedData.items.map((tariff) => (
                  <tr key={tariff.code}>
                    <td>
                      <label className="tariff-checkbox-target">
                        <input
                          type="checkbox"
                          aria-label={`Select ${tariff.name}`}
                          checked={Boolean(selected[tariff.code])}
                          disabled={busy}
                          onChange={(event) =>
                            setSelected((current) => {
                              const next = { ...current };
                              if (event.target.checked)
                                next[tariff.code] = tariff;
                              else delete next[tariff.code];
                              return next;
                            })
                          }
                        />
                      </label>
                    </td>
                    <td>{tariff.code}</td>
                    <td title={tariff.name}>{tariff.name}</td>
                    <td title={tariff.group}>{tariff.group}</td>
                    <td>₹{money(tariff.rate)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {busy && !displayedData.items.length && (
          <div className="no-results">Loading tariffs…</div>
        )}
        {error && (
          <div className="no-results" role="alert">
            {error}
          </div>
        )}
        {!busy && !error && !displayedData.items.length && (
          <div className="no-results">No eligible tariffs found.</div>
        )}
        {!error && displayedData.total > 0 && (
          <div className="table-pagination">
            <span>{displayedData.total} eligible tariffs</span>
            <Pagination
              page={page}
              pageCount={Math.max(1, Math.ceil(displayedData.total / 10))}
              onChange={setPage}
            />
          </div>
        )}
        <div className="confirm-actions">
          <button className="button button-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="button button-primary"
            disabled={!Object.keys(selected).length || busy || Boolean(error)}
            onClick={() => {
              onAdd(Object.values(selected));
              onClose();
            }}
          >
            Add selected ({Object.keys(selected).length})
          </button>
        </div>
      </div>
    </div>
  );
}
