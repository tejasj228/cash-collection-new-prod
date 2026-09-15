import React, { useState } from "react";
import { useEscapeToClose } from "../../../../shared/hooks/useEscapeToClose";
import { useModalClose } from "../../../../shared/hooks/useModalClose";
import { compactIdentifier } from "../../../../shared/utils/formatters";
import { Icon } from "../../../../shared/components/Icon";
import "./PatientDetails.css";
import { patientDisplayName } from "./patientDetails";

function PatientBanner({ patient, patientMode }) {
  const known = patientMode === "existing" && patient;
  const name = patientDisplayName(patient, known);
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

export { PatientBanner };
