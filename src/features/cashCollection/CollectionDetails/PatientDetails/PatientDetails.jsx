import React, { useState } from "react";
import { useEscapeToClose } from "../../../../shared/hooks/useEscapeToClose";
import { useModalClose } from "../../../../shared/hooks/useModalClose";
import { compactIdentifier } from "../../../../shared/utils/formatters";
import { Icon } from "../../../../shared/components/Icon";
import "./PatientDetails.css";
import { patientDisplayName } from "./patientDetails";

function PatientBanner({ patient, patientMode, hospitalService }) {
  const known = patientMode === "existing" && patient;
  const name = patientDisplayName(patient, known);
  const hasPhoto = Boolean(known && patient.photoUrl);
  const [photoOpen, setPhotoOpen] = useState(false);
  const admissionNumber =
    known && hospitalService === "IPD" ? patient.ipd || "—" : "—";
  const hospitalServiceTone =
    hospitalService === "IPD"
      ? "blue"
      : hospitalService === "OPD"
        ? "green"
        : "amber";
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
                <span className="chip identifier" title="CR No.">
                  CR No. : {compactIdentifier(patient.cr)}
                </span>
                <span className="chip muted" title="Admission No.">
                  Admission No. : {compactIdentifier(admissionNumber)}
                </span>
                <span className="chip" title="Age / Sex">
                  Age / Sex : {patient.age} / {patient.sex}
                </span>
                <span className="chip strong" title="Category">
                  Category : {patient.category}
                </span>
                <span className="chip muted" title="Mobile No.">
                  Mobile No. : {compactIdentifier(patient.mobile)}
                </span>
                <span className="chip muted" title="ABHA No.">
                  ABHA No. : {patient.abhaNumber}
                </span>
                <span className="chip muted" title="ABHA Address">
                  ABHA Address : {patient.abhaAddress}
                </span>
              </>
            )}
          </div>
        </div>
        <span
          className={`patient-state ${known ? hospitalServiceTone : "amber"}`}
          title="Hospital Service"
        >
          <span className="status-dot" />
          {known ? hospitalService || "—" : "Identity pending"}
        </span>
      </div>
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
