export const patientEpisodeType = (service) =>
  service?.id === "ipd" ? "IPD" : "OPD";

export function patientAdmissionState(patient) {
  if (typeof patient?.isAdmitted === "boolean") return patient.isAdmitted;
  const status = String(patient?.status || "")
    .trim()
    .toLowerCase();
  if (status === "admitted") return true;
  if (
    [
      "not admitted",
      "discharged",
      "outpatient",
      "visited today",
      "registered",
    ].includes(status)
  )
    return false;
  return null;
}

export function directPatientError(patient, service) {
  const admitted = patientAdmissionState(patient);
  const listFamily =
    patient?.listServiceFamily || patient?.pendingServiceFamily;
  if (admitted === null && listFamily)
    return (listFamily === "IPD") === (service?.id === "ipd")
      ? ""
      : "This pending-list patient belongs to a different hospital service.";
  if (admitted === null)
    return "The backend has not confirmed this patient's admission status.";
  if (service?.id === "ipd" && !admitted)
    return "Only currently admitted patients can use IPD collection.";
  if (service?.id !== "ipd" && admitted)
    return "This patient is admitted. Use IPD collection, not OPD or Emergency.";
  return "";
}
