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
                {[
                  ["CR No.", compactIdentifier(patient.cr)],
                  ["Admission No.", compactIdentifier(admissionNumber)],
                  [
                    "Age / Sex",
                    `${patient.age || "—"} / ${patient.sex || "—"}`,
                  ],
                  ["Category", patient.category],
                  ["Mobile No.", compactIdentifier(patient.mobile)],
                  ["ABHA No.", patient.abhaNumber],
                  ["ABHA Address", patient.abhaAddress],
                ].map(([label, value]) => (
                  <span className="chip patient-detail" key={label} title={label}>
                    <span className="patient-detail-label">{label} :</span>{" "}
                    <strong>{value || "—"}</strong>
                  </span>
                ))}
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
