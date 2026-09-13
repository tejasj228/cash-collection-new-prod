import React, { useEffect, useState } from "react";
import { useAppData } from "../../../../app/providers/AppDataProvider";
import { useEscapeToClose } from "../../../../shared/hooks/useEscapeToClose";
import { useModalClose } from "../../../../shared/hooks/useModalClose";
import {
  compactIdentifier,
  optionValue,
} from "../../../../shared/utils/formatters";
import { Icon } from "../../../../shared/components/Icon";
import { Button, StatusPill } from "../../../../shared/components/ui";
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

function PatientSearchPopover({
  query,
  onChange,
  onSelect,
  onClose,
  service,
  listOnly = false,
}) {
  const { closing, requestClose } = useModalClose(onClose);
  useEscapeToClose(requestClose);
  const { patients } = useAppData();
  const [listQuery, setListQuery] = useState("");
  const episodeType = service?.id === "ipd" ? "IPD" : "OPD";
  const activeQuery = listOnly ? listQuery : query;
  const eligiblePatients = patients.filter((patient) =>
    String(patient.episode || "")
      .toUpperCase()
      .startsWith(episodeType),
  );
  const results = eligiblePatients.filter(
    (patient) =>
      !activeQuery ||
      compactIdentifier(patient.cr).includes(compactIdentifier(activeQuery)),
  );
  const changeQuery = (value) => {
    const digits = String(value || "")
      .replace(/\D/g, "")
      .slice(0, 15);
    if (listOnly) setListQuery(digits);
    else onChange(digits);
  };
  return (
    <div
      className="popover-backdrop"
      data-closing={closing || undefined}
      onMouseDown={requestClose}
    >
      <div
        className="patient-popover"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="popover-heading">
          <div>
            <strong>
              {listOnly
                ? `Existing ${episodeType} Patients`
                : `Find ${episodeType} Patient by CR No.`}
            </strong>
          </div>
          <button className="plain-icon" onClick={requestClose}>
            <Icon name="close" size={17} />
          </button>
        </div>
        <div className="search-field popover-search">
          <Icon name="search" size={16} />
          <input
            autoFocus
            inputMode="numeric"
            maxLength="15"
            value={activeQuery}
            onChange={(event) => changeQuery(event.target.value)}
            placeholder={
              listOnly
                ? `Filter ${episodeType} patients by CR No.`
                : "Enter CR No."
            }
          />
        </div>
        <div className="patient-results">
          {results.map((patient) => (
            <button
              key={patient.id}
              className="patient-result"
              onClick={() => onSelect(patient)}
            >
              <div className="avatar patient-avatar">
                {patient.name
                  .split(" ")
                  .map((word) => word[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div>
                <strong>{patient.name}</strong>
                <span>
                  CR {compactIdentifier(patient.cr)} · {patient.episode}
                </span>
              </div>
              <Icon name="chevron" size={15} />
            </button>
          ))}
          {!results.length && (
            <div className="no-results">
              No matching {episodeType} patient found.
            </div>
          )}
        </div>
        <div className="popover-footer">
          <Icon name="info" size={14} />
          Showing only existing {episodeType} patients for{" "}
          {service?.label || "this service"}.
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
  const canContinue = Boolean(selectedPatient);
  const clearEligibility = () => setEligibilityMessage("");
  const continueIfEligible = async () => {
    if (!canContinue || !selectedWorkflow) return;
    setCheckingEligibility(true);
    setEligibilityMessage("");
    try {
      if (typeof services?.checkEligibility !== "function")
        throw new Error("Patient eligibility service is unavailable.");
      const result = await services.checkEligibility({
        patientId: selectedPatient.id,
        crNumber: selectedPatient.cr,
        hospitalServiceId: service.id,
        chargeTypeId: service.legacyChargeTypeId,
        requestType,
        billingServiceId: selectedWorkflow.id,
        processingBillingServiceId: selectedWorkflow.processingServiceId,
        workflowId: selectedWorkflow.uiFamily,
      });
      if (!result?.eligible) {
        setEligibilityMessage(
          result?.message ||
            "This patient is not eligible for the selected transaction.",
        );
        return;
      }
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
            <Button
              variant="soft"
              onClick={() => setPatientPopup("find")}
              disabled={!/^\d{15}$/.test(crQuery)}
            >
              Find Patient
            </Button>
            {service.id === "ipd" && (
              <Button
                variant="soft"
                className="existing-patients-button"
                onClick={() => setPatientPopup("existing")}
                icon="users"
              >
                Existing Patients
              </Button>
            )}
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
      {patientPopup && (
        <PatientSearchPopover
          query={crQuery}
          onChange={changeCr}
          service={service}
          listOnly={patientPopup === "existing"}
          onSelect={(patient) => {
            setSelectedPatient(patient);
            setCrQuery(compactIdentifier(patient.cr));
            setPatientPopup(null);
            clearEligibility();
          }}
          onClose={() => setPatientPopup(null)}
        />
      )}
    </div>
  );
}

function PatientBanner({ patient, patientMode }) {
  const known = patientMode === "existing" && patient;
  const name = known ? patient.name : "New patient record";
  const hasPhoto = Boolean(known && patient.photoUrl);
  const [photoOpen, setPhotoOpen] = useState(false);
  const facts = known
    ? [
        ["CR No.", patient.cr, true],
        ["Admission No.", patient.ipd, true],
        ["Account No.", patient.account, true],
        ["Department / Unit", `${patient.department} / ${patient.unit}`, false],
        [
          "Ward / Bed",
          patient.ward === "—" ? "—" : `${patient.ward} / ${patient.bed}`,
          false,
        ],
        ["Room Type", patient.roomType, false],
        ["Consultant Name", patient.consultant, false],
        ["Admitted On", patient.admittedOn, false],
      ]
    : [
        ["CR No.", "Generated after registration", true],
        ["Admission No.", "—", true],
        ["Account No.", "—", true],
        ["Department / Unit", "—", false],
      ];
  return (
    <section className="patient-banner">
      <div className="patient-identity">
        {hasPhoto ? (
          <button
            type="button"
            className="patient-photo is-clickable"
            onClick={() => setPhotoOpen(true)}
            aria-label={`View ${name}'s photo`}
          >
            <img src={patient.photoUrl} alt="" />
          </button>
        ) : (
          <span className="patient-photo" aria-hidden={!known}>
            <Icon name="user" size={30} />
          </span>
        )}
        <div className="patient-identity-copy">
          <div className="patient-name-row">
            <h2>{name}</h2>
          </div>
          <div className="patient-chips">
            {known && (
              <>
                <span className="chip">{patient.age} yr</span>
                <span className="chip">{patient.sex}</span>
                <span className="chip strong">{patient.category}</span>
                <span className="chip">{patient.episode}</span>
                <span className="chip muted">
                  {compactIdentifier(patient.mobile)}
                </span>
                {patient.abhaNumber && (
                  <span className="chip muted">ABHA {patient.abhaNumber}</span>
                )}
                {patient.abhaAddress && (
                  <span className="chip muted">{patient.abhaAddress}</span>
                )}
              </>
            )}
          </div>
        </div>
        <span
          className={`patient-state ${known && patient.status === "Admitted" ? "blue" : known ? "green" : "amber"}`}
        >
          <span className="status-dot" />
          {known ? patient.status : "Identity pending"}
        </span>
      </div>
      <dl className="patient-facts">
        {facts.map(([label, value, mono]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd className={mono ? "mono" : ""}>
              {mono ? compactIdentifier(value) : value}
            </dd>
          </div>
        ))}
      </dl>
      {photoOpen && (
        <PatientPhotoLightbox
          name={name}
          photoUrl={patient.photoUrl}
          onClose={() => setPhotoOpen(false)}
        />
      )}
    </section>
  );
}

function PatientPhotoLightbox({ name, photoUrl, onClose }) {
  const { closing, requestClose } = useModalClose(onClose);
  useEscapeToClose(requestClose);
  return (
    <div
      className="popover-backdrop"
      data-closing={closing || undefined}
      onMouseDown={requestClose}
    >
      <div
        className="patient-photo-lightbox"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="plain-icon patient-photo-lightbox-close"
          onClick={requestClose}
          aria-label="Close"
        >
          <Icon name="close" size={18} />
        </button>
        <img src={photoUrl} alt={name} />
      </div>
    </div>
  );
}

export { PatientSearchPopover, DirectSetup, PatientBanner };
