import prototypePhotoUrl from "./prototype-patient-photo.png";

// Imported only by the development runtime. Never use this as a production fallback.
export function withPrototypePatientPhoto(patient) {
  return patient && !patient.photoUrl
    ? { ...patient, photoUrl: prototypePhotoUrl, isPrototypePhoto: true }
    : patient;
}
