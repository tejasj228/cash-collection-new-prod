import React, { useEffect, useRef, useState } from "react";
import "./Direct.css";
import {
  patientEpisodeType,
  directPatientError,
  patientAdmissionState,
} from "./direct";
import { useAppData } from "../../../../app/providers/AppDataProvider";
import { useEscapeToClose } from "../../../../shared/hooks/useEscapeToClose";
import { useModalClose } from "../../../../shared/hooks/useModalClose";
import {
  compactIdentifier,
  optionValue,
} from "../../../../shared/utils/formatters";
import { Icon } from "../../../../shared/components/Icon";
import {
  Button,
  PageHeading,
  StatusPill,
  Pagination,
} from "../../../../shared/components/ui";
import {
  SelectField,
  TextField,
} from "../../../../shared/components/FormFields";

// A flat, self-contained illustration (no external asset) for the Direct
// Collection setup screen's side panel — a counter-side tap-to-pay, in the
// app's own palette so it reads as part of the product, not stock art.
function DirectCollectionIllustration() {
  return (
    <svg
      className="direct-setup-art-svg"
      viewBox="0 0 240 210"
      role="img"
      aria-hidden="true"
    >
      <ellipse cx="120" cy="190" rx="88" ry="10" fill="#eef2f8" />
      {/* counter */}
      <rect
        x="34"
        y="140"
        width="172"
        height="42"
        rx="10"
        fill="#fff"
        stroke="#dbe4f0"
        strokeWidth="2"
      />
      <rect x="34" y="140" width="172" height="13" rx="6.5" fill="#2b7fd6" />
      {/* terminal */}
      <rect
        x="92"
        y="66"
        width="66"
        height="86"
        rx="11"
        fill="#fff"
        stroke="#dbe4f0"
        strokeWidth="2"
      />
      <rect x="99" y="75" width="52" height="58" rx="5" fill="#eaf3fd" />
      <circle cx="125" cy="103" r="17" fill="#eaf6f1" />
      <path
        d="M117 103.5l5.5 5.5 11-12"
        fill="none"
        stroke="#1c9e78"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="112" y="137" width="26" height="6" rx="3" fill="#c7d6ea" />
      {/* tapped card */}
      <g transform="rotate(-16 178 76)">
        <rect x="156" y="60" width="46" height="30" rx="6" fill="#5bc0a8" />
        <rect
          x="162"
          y="67"
          width="16"
          height="4"
          rx="2"
          fill="#fff"
          opacity="0.85"
        />
        <rect
          x="162"
          y="76"
          width="26"
          height="4"
          rx="2"
          fill="#fff"
          opacity="0.55"
        />
      </g>
      <path
        d="M204 58q7 8 4 18"
        fill="none"
        stroke="#a9b8cd"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M211 54q10 11 5 25"
        fill="none"
        stroke="#c3ceda"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* receipt curling from the counter */}
      <path
        d="M52 141v-30a4 4 0 0 1 4-4h28a4 4 0 0 1 4 4v30"
        fill="#fff"
        stroke="#dbe4f0"
        strokeWidth="2"
      />
      <rect x="60" y="115" width="20" height="3.5" rx="1.75" fill="#e4eaf3" />
      <rect x="60" y="123" width="14" height="3.5" rx="1.75" fill="#e4eaf3" />
      <rect x="60" y="131" width="20" height="3.5" rx="1.75" fill="#e4eaf3" />
      {/* accents */}
      <circle cx="48" cy="70" r="8" fill="#f0a94e" opacity="0.85" />
      <circle cx="33" cy="90" r="5" fill="#f0a94e" opacity="0.45" />
      <circle cx="205" cy="112" r="7" fill="#a17bd4" opacity="0.7" />
    </svg>
  );
}

function FindPatientDialog({ services, service, onSelect, onClose }) {
  const dailyListing = service.id !== "ipd";
  const [field, setField] = useState(dailyListing ? "cr" : "mobile");
  const [value, setValue] = useState("");
  const [matches, setMatches] = useState([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const active = useRef(true);
  useEffect(
    () => () => {
      active.current = false;
    },
    [],
  );
  useEscapeToClose(onClose);
  const search = async (event) => {
    event.preventDefault();
    if (!value.trim() || busy) return;
    setBusy(true);
    setMatches([]);
    setMessage("");
    try {
      const result = await services.searchPatientPage({
        query: value.trim(),
        searchField: field,
        exactCr: field === "cr",
        hospitalServiceId: service.id,
        page: 0,
        size: 10,
      });
      if (!active.current) return;
      setMatches(result.items || []);
      setMessage(
        result.items?.length
          ? "Select the matching patient below."
          : "No matching patient found.",
      );
    } catch (error) {
      if (active.current) setMessage(error.message || "Patient search failed.");
    } finally {
      if (active.current) setBusy(false);
    }
  };
  return (
    <div className="popover-backdrop" onMouseDown={onClose}>
      <form
        className="confirm-dialog find-patient-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Find Patient"
        onSubmit={search}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="confirm-head">
          <strong>Find Patient</strong>
          <button
            type="button"
            className="plain-icon"
            aria-label="Close patient search"
            onClick={onClose}
          >
            <Icon name="close" size={17} />
          </button>
        </div>
        <p>Choose an identifier and enter its value to find a patient.</p>
        <SelectField
          label="Search by"
          value={field}
          options={
            dailyListing
              ? [
                  { id: "cr", label: "CR Number" },
                  { id: "name", label: "Patient Name" },
                ]
              : [
                  { id: "mobile", label: "Mobile Number" },
                  { id: "abhaNumber", label: "ABHA Number" },
                  { id: "abhaAddress", label: "ABHA Address" },
                ]
          }
          onChange={(next) => {
            setField(next);
            setValue("");
            setMatches([]);
            setMessage("");
          }}
          disabled={busy}
        />
        <label className="field">
          <span className="field-label">
            {field === "cr"
              ? "CR Number"
              : field === "name"
                ? "Patient Name"
                : field === "mobile"
                  ? "Mobile Number"
                  : field === "abhaNumber"
                    ? "ABHA Number"
                    : "ABHA Address"}
          </span>
          <input
            className="find-patient-input"
            aria-label="Patient identifier"
            autoFocus
            value={value}
            disabled={busy}
            onChange={(event) => {
              setValue(event.target.value);
              setMatches([]);
              setMessage("");
            }}
          />
        </label>
        {message && <p role="status">{message}</p>}
        {matches.map((patient) => (
          <button
            className="button button-soft find-patient-match"
            type="button"
            key={patient.id || patient.cr}
            onClick={() => onSelect(patient)}
          >
            {patient.name} — CR No. {patient.cr}
          </button>
        ))}
        <div className="confirm-actions">
          <button
            className="button button-ghost"
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="button button-primary"
            type="submit"
            disabled={busy || !value.trim()}
          >
            {busy ? "Searching…" : "Search"}
          </button>
        </div>
      </form>
    </div>
  );
}

const PatientResultRows = React.memo(function PatientResultRows({
  items,
  onSelect,
  loading,
}) {
  return items.map((patient) => (
    <button
      key={patient.id || patient.cr}
      className="patient-result"
      disabled={loading}
      onClick={() => onSelect(patient)}
    >
      <div className="avatar patient-avatar">{patient.name?.slice(0, 1)}</div>
      <div>
        <strong>{patient.name}</strong>
        <span>CR {compactIdentifier(patient.cr)}</span>
      </div>
      <Icon name="chevron" size={15} />
    </button>
  ));
});

function PatientSearchPopover({
  query,
  onChange,
  onSelect,
  onClose,
  service,
  listOnly = false,
  services,
}) {
  const { closing, requestClose } = useModalClose(onClose);
  useEscapeToClose(requestClose);
  const [listQuery, setListQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const activeQuery = listOnly ? listQuery : query;
  const episodeType = patientEpisodeType(service);
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(
      async () => {
        setLoading(true);
        setError("");
        try {
          if (typeof services?.searchPatientPage !== "function")
            throw new Error("Database patient search is unavailable.");
          const result = await services.searchPatientPage({
            query: activeQuery.trim(),
            exactCr: !listOnly,
            hospitalServiceId: service.id,
            admittedOnly: service.id === "ipd",
            page: page - 1,
            size: 10,
            sort: "admittedOn,desc",
          });
          if (!active) return;
          const items = result.items || [];
          if (items.length > 10)
            throw new Error(
              "The backend must return at most 10 patients per page.",
            );
          if (
            items.some(
              (patient) =>
                !(
                  (patient.pendingServiceFamily || patient.listServiceFamily) &&
                  patientAdmissionState(patient) === null
                ) && directPatientError(patient, service),
            )
          )
            throw new Error(
              "The backend returned patients with an incompatible or unknown admission status.",
            );
          setData({ items, total: Number(result.total || 0) });
        } catch (err) {
          if (active) setError(err.message || "Patients could not be loaded.");
        } finally {
          if (active) setLoading(false);
        }
      },
      activeQuery ? 250 : 0,
    );
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [activeQuery, listOnly, page, service, services]);
  const changeQuery = (value) => {
    setPage(1);
    if (listOnly) setListQuery(value.slice(0, 120));
    else onChange(value.replace(/\D/g, "").slice(0, 15));
  };
  return (
    <div
      className="popover-backdrop"
      data-closing={closing || undefined}
      onMouseDown={requestClose}
    >
      <div
        className="patient-popover"
        role="dialog"
        aria-modal="true"
        aria-label="Existing patients"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="popover-heading">
          <strong>
            {listOnly ? `Existing ${episodeType} Patients` : "Find Patient"}
          </strong>
          <button
            className="plain-icon"
            aria-label="Close patients"
            onClick={requestClose}
          >
            <Icon name="close" size={17} />
          </button>
        </div>
        <div className="search-field popover-search">
          <Icon name="search" size={16} />
          <input
            autoFocus
            value={activeQuery}
            onChange={(event) => changeQuery(event.target.value)}
            placeholder={
              listOnly ? "Search By CR No. Or Patient Name" : "Enter CR No."
            }
          />
        </div>
        <div className="patient-results" aria-busy={loading}>
          {loading && !data.items.length ? (
            <div className="no-results">Loading patients…</div>
          ) : error ? (
            <div className="no-results" role="alert">
              {error}
            </div>
          ) : (
            <PatientResultRows
              items={data.items}
              onSelect={onSelect}
              loading={loading}
            />
          )}
          {!loading && !error && !data.items.length && (
            <div className="no-results">No matching patients found.</div>
          )}
        </div>
        <div
          className="table-pagination patient-picker-pagination"
          aria-busy={loading}
        >
          <span>{data.total} matching patients</span>
          <Pagination
            page={page}
            pageCount={Math.max(1, Math.ceil(data.total / 10))}
            onChange={setPage}
          />
        </div>
      </div>
    </div>
  );
}

function DirectSetup({
  service,
  onBack,
  onContinue,
  requestType,
  setRequestType,
  billingService,
  setBillingService,
  crQuery,
  setCrQuery,
  selectedPatient,
  setSelectedPatient,
  services,
  onModalVisibilityChange,
}) {
  const { billingByService } = useAppData();
  const [patientPopup, setPatientPopup] = useState(null);
  useEffect(() => {
    onModalVisibilityChange?.(Boolean(patientPopup));
  }, [patientPopup, onModalVisibilityChange]);
  useEffect(
    () => () => onModalVisibilityChange?.(false),
    [onModalVisibilityChange],
  );
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [eligibilityMessage, setEligibilityMessage] = useState("");
  const billingOptions = billingByService[service.id]?.[requestType] || [];
  const selectedWorkflow = billingOptions.find(
    (option) => optionValue(option) === String(billingService),
  );
  const currentSelection = useRef("");
  currentSelection.current = `${service.id}:${requestType}:${billingService}:${selectedPatient?.cr || crQuery}`;
  useEffect(
    () => () => {
      currentSelection.current = "";
    },
    [],
  );
  const canContinue = Boolean(selectedPatient) || /^\d{15}$/.test(crQuery);
  const clearEligibility = () => setEligibilityMessage("");
  const continueIfEligible = async () => {
    if (!canContinue || !selectedWorkflow) return;
    setCheckingEligibility(true);
    setEligibilityMessage("");
    const selection = currentSelection.current;
    try {
      if (typeof services?.checkEligibility !== "function")
        throw new Error("Patient eligibility service is unavailable.");
      if (typeof services?.searchPatientPage !== "function")
        throw new Error("Database patient lookup is unavailable.");
      const lookup = await services.searchPatientPage({
        query: selectedPatient?.cr || crQuery,
        exactCr: true,
        hospitalServiceId: service.id,
        admittedOnly: service.id === "ipd",
        page: 0,
        size: 10,
      });
      if (selection !== currentSelection.current) return;
      const patient = lookup.items?.find(
        (item) =>
          compactIdentifier(item.cr) ===
          compactIdentifier(selectedPatient?.cr || crQuery),
      );
      if (!patient)
        throw new Error(
          "No eligible database patient was found for this CR number.",
        );
      const admissionError = directPatientError(patient, service);
      if (admissionError) throw new Error(admissionError);
      const result = await services.checkEligibility({
        crNumber: patient.cr,
        source: "direct",
        hospitalServiceId: service.id,
        chargeTypeId: service.legacyChargeTypeId,
        requestType,
        billingServiceId: selectedWorkflow.id,
        processingBillingServiceId: selectedWorkflow.processingServiceId,
        workflowId: selectedWorkflow.uiFamily,
      });
      if (selection !== currentSelection.current) return;
      if (!result?.eligible) {
        setEligibilityMessage(
          result?.message ||
            "This patient is not eligible for the selected transaction.",
        );
        return;
      }
      setSelectedPatient(patient);
      setCrQuery(compactIdentifier(patient.cr));
      onContinue(result);
    } catch (error) {
      setEligibilityMessage(
        error.message || "Patient eligibility could not be verified.",
      );
    } finally {
      setCheckingEligibility(false);
    }
  };
  const changeCr = (value) => {
    const digits = String(value || "")
      .replace(/\D/g, "")
      .slice(0, 15);
    setCrQuery(digits);
    if (selectedPatient && compactIdentifier(selectedPatient.cr) !== digits)
      setSelectedPatient(null);
    clearEligibility();
  };
  return (
    <div className="flow-screen">
      <div className="flow-top">
        <button className="back-link" onClick={onBack}>
          <Icon name="back" size={15} />
          Back to service selection
        </button>
      </div>
      <div className="flow-context">
        <div className={`context-icon ${service.tone}`}>
          <Icon name={service.icon} size={22} />
        </div>
        <div>
          <span>Direct Collection</span>
          <strong>{service.label}</strong>
        </div>
      </div>
      <div className="setup-layout">
        <section className="panel setup-main">
          <div className="setup-heading">
            <h2>Direct Collection</h2>
            <span className="required-note">
              <em>*</em> Required fields
            </span>
          </div>
          <div className="divider-label">
            <span>Patient Reference</span>
            <span className="divider-line" />
          </div>
          <div className="patient-lookup-box">
            <TextField
              label="CR No."
              value={crQuery}
              onChange={changeCr}
              placeholder="Enter a registered CR No."
              required
              mono
              inputMode="numeric"
              maxLength={15}
              invalid={Boolean(crQuery && !/^\d{15}$/.test(crQuery))}
            />
            <Button variant="soft" onClick={() => setPatientPopup("find")}>
              Find Patient
            </Button>
            {
              <Button
                variant="soft"
                className="existing-patients-button"
                onClick={() => setPatientPopup("existing")}
                icon="users"
              >
                Existing Patients
              </Button>
            }
            {selectedPatient && (
              <div className="selected-patient">
                <div className="avatar patient-avatar">
                  {selectedPatient.name
                    .split(" ")
                    .map((word) => word[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div>
                  <strong>{selectedPatient.name}</strong>
                  <span>
                    CR {compactIdentifier(selectedPatient.cr)} ·{" "}
                    {selectedPatient.episode}
                  </span>
                </div>
                <StatusPill>Selected</StatusPill>
                <button
                  onClick={() => {
                    setSelectedPatient(null);
                    clearEligibility();
                  }}
                  className="plain-icon"
                  aria-label="Clear patient"
                >
                  <Icon name="close" size={15} />
                </button>
              </div>
            )}
          </div>
          <div className="divider-label">
            <span>Transaction</span>
            <span className="divider-line" />
          </div>
          <div className="setup-fields">
            <SelectField
              label="Transaction Type"
              value={requestType}
              onChange={(value) => {
                const first = billingByService[service.id]?.[value]?.[0];
                setRequestType(value);
                setBillingService(first ? optionValue(first) : "");
                clearEligibility();
              }}
              options={Object.keys(billingByService[service.id] || {})}
              required
            />
            <SelectField
              label="Billing Service"
              value={billingService}
              onChange={(value) => {
                setBillingService(value);
                clearEligibility();
              }}
              options={billingOptions}
              required
            />
          </div>
          {eligibilityMessage && (
            <div className="eligibility-message" role="alert">
              <Icon name="info" size={16} />
              <div>
                <strong>Transaction not allowed</strong>
                <span>{eligibilityMessage}</span>
              </div>
            </div>
          )}
          <div className="setup-actions">
            <Button variant="ghost" onClick={onBack}>
              Cancel
            </Button>
            <Button
              onClick={continueIfEligible}
              disabled={
                !canContinue || !selectedWorkflow || checkingEligibility
              }
              icon="arrow"
            >
              {checkingEligibility
                ? "Checking eligibility…"
                : selectedWorkflow?.uiFamily === "bill-settlement"
                  ? "Continue to Settlement"
                  : "Continue to Tariff Details"}
            </Button>
          </div>
        </section>
        <aside className="panel direct-setup-art">
          <DirectCollectionIllustration />
          <h3>Quick, Direct Collection</h3>
          <p>
            Look up the patient, pick a transaction type and billing service,
            then move straight to tariff details — no request queue involved.
          </p>
        </aside>
      </div>
      {patientPopup &&
        React.createElement(
          patientPopup === "find" ? FindPatientDialog : PatientSearchPopover,
          {
            query: crQuery,
            onChange: changeCr,
            service,
            listOnly: true,
            services,
            onSelect: (patient) => {
              const error =
                patient.pendingServiceFamily &&
                patientAdmissionState(patient) === null
                  ? ""
                  : directPatientError(patient, service);
              if (error) {
                setEligibilityMessage(error);
                return;
              }
              setSelectedPatient(patient);
              setCrQuery(compactIdentifier(patient.cr));
              setPatientPopup(null);
              clearEligibility();
            },
            onClose: () => setPatientPopup(null),
          },
        )}
    </div>
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

export {
  FindPatientDialog,
  PatientSearchPopover,
  DirectSetup,
  DirectSelector,
  EstimatesHome,
};
