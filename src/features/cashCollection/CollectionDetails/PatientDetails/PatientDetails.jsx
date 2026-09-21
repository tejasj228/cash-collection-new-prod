import React, { useEffect, useRef, useState } from "react";
import { useEscapeToClose } from "../../../../shared/hooks/useEscapeToClose";
import { useModalClose } from "../../../../shared/hooks/useModalClose";
import { compactIdentifier } from "../../../../shared/utils/formatters";
import { Icon } from "../../../../shared/components/Icon";
import "./PatientDetails.css";
import { patientDisplayName } from "./patientDetails";

function PatientAvatar({ sex }) {
  const normalized = String(sex || "")
    .trim()
    .toLowerCase();
  const female = ["female", "f"].includes(normalized);
  const male = ["male", "m"].includes(normalized);
  if (!male && !female) return <Icon name="user" size={30} />;
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 48 48"
      role="img"
      aria-label={female ? "Female patient avatar" : "Male patient avatar"}
    >
      {female && (
        <path d="M13 27V19c0-9 5-13 11-13s11 4 11 13v15H13Z" fill="#7b8da7" />
      )}
      <path
        d="M9 43c1-9 6-14 15-14s14 5 15 14"
        fill="#c2cede"
        stroke="#7b8da7"
        strokeWidth="1.5"
      />
      <path
        d="M20 26v6l4 4 4-4v-6"
        fill="#e7edf5"
        stroke="#7b8da7"
        strokeWidth="1.5"
      />
      <ellipse
        cx="24"
        cy="19"
        rx="8"
        ry="10"
        fill="#e7edf5"
        stroke="#7b8da7"
        strokeWidth="1.5"
      />
      {female ? (
        <path
          d="M15 18c0-9 4-12 9-12 7 0 11 6 10 14-5-1-8-5-9-8-2 3-5 5-10 6Z"
          fill="#7b8da7"
        />
      ) : (
        <path
          d="M16 18c-2-7 2-12 8-12 7 0 10 5 9 12l-4-5c-4 2-8 2-11 0Z"
          fill="#7b8da7"
        />
      )}
    </svg>
  );
}

function MorePatientInfo({ patient, onModalVisibilityChange }) {
  const dialog = useRef(null);
  const open = () => {
    dialog.current.showModal();
    onModalVisibilityChange?.(true);
  };
  useEffect(
    () => () => onModalVisibilityChange?.(false),
    [onModalVisibilityChange],
  );
  return (
    <>
      <button
        type="button"
        className="back-link more-patient-info"
        onClick={open}
      >
        <Icon name="info" size={16} />
        More patient info
      </button>
      <dialog
        ref={dialog}
        className="confirm-dialog more-patient-info-dialog"
        aria-labelledby="more-patient-info-title"
        onClose={() => onModalVisibilityChange?.(false)}
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current.close();
        }}
      >
        <div className="confirm-head">
          <strong id="more-patient-info-title">More patient info</strong>
          <button
            type="button"
            className="plain-icon"
            aria-label="Close patient info"
            onClick={() => dialog.current.close()}
            autoFocus
          >
            <Icon name="close" size={17} />
          </button>
        </div>
        <div className="more-patient-info-body">
          {patient?.additionalInfo?.length ? (
            <dl className="more-patient-info-grid">
              {patient.additionalInfo.map(({ key, label, value }) => (
                <div className="more-patient-info-item" key={key}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="more-patient-info-empty">
              No additional patient information is available.
            </p>
          )}
        </div>
      </dialog>
    </>
  );
}

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
            <img
              src={patient.photoUrl}
              alt=""
              className={
                patient.isPrototypePhoto
                  ? "prototype-patient-thumbnail"
                  : undefined
              }
            />
          </button>
        ) : (
          <span className="patient-photo" aria-hidden={!known}>
            <PatientAvatar sex={known ? patient.sex : null} />
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
                  <span
                    className="chip patient-detail"
                    key={label}
                    title={label}
                  >
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

export { PatientBanner, MorePatientInfo };
