export const patientDisplayName = (patient, known) =>
  known && patient ? patient.name : "New patient record";
