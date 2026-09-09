import React, { useState } from "react";
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
}) {
  const { billingByService } = useAppData();
  const [patientPopup, setPatientPopup] = useState(null);
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
      <div className="setup-layout setup-layout-single">
        <section className="panel setup-main">
          <div className="setup-heading">
            <h2>Set Up Direct Collection</h2>
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
            <Button
              variant="soft"
              className="existing-patients-button"
              onClick={() => setPatientPopup("existing")}
              icon="users"
            >
              Existing Patients
            </Button>
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
    </section>
  );
}

export { PatientSearchPopover, DirectSetup, PatientBanner };
