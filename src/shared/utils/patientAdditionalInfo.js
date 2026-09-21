const TILE_FIELDS = new Set([
  "crno",
  "cr_num",
  "pat_name",
  "pat_age",
  "pat_sex",
  "adm_no",
  "ipd_admission_num",
  "category_name",
  "mobile_num",
  "abha_num",
  "abha_address",
  "photo_url",
  "patient_category_code",
]);

const LABELS = {
  "father/mother/spouse name": "Father / mother / spouse name",
  admission_status: "Admission status",
  is_admitted: "Currently admitted",
  dob: "Date of birth",
  date_of_birth: "Date of birth",
  pat_dob: "Date of birth",
  registration_date: "Registration date / time",
  registeration_date: "Registration date / time",
  pat_reg_date: "Registration date / time",
  pat_registration_date: "Registration date / time",
  address: "Patient address",
  pat_address: "Patient address",
  patient_address: "Patient address",
  permanent_address: "Patient address",
  dateofbirth: "Date of birth",
  emgcontact: "Emergency contact number",
  regdate: "Registration date / time",
  patinetadharno: "Patient Aadhaar number",
  patientadharno: "Patient Aadhaar number",
  pataddress: "Patient address",
};

function readableLabel(key) {
  const normalizedKey = String(key).trim().toLowerCase();
  const label =
    LABELS[normalizedKey] ||
    String(key)
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/_/g, " ")
      .replace(/\b(id|ipd|opd|cr|abha|url)\b/gi, (value) =>
        value.toUpperCase(),
      );
  return label
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
    .replace(/\bNumber\b/g, "No.");
}

function displayValue(value) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
  if (value && typeof value === "object") return JSON.stringify(value);
  if (value == null) return "-";
  const text = String(value).trim();
  return text || "-";
}

function formatValue(key, value) {
  const text = displayValue(value);
  const normalizedKey = String(key).trim().toLowerCase();
  const registrationKeys = [
    "registration_date",
    "registeration_date",
    "pat_reg_date",
    "pat_registration_date",
    "regdate",
  ];
  if (!registrationKeys.includes(normalizedKey) || text === "-") return text;
  return text
    .replace("T", " / ")
    .replace(/^(\S+)\s+(?=\d{1,2}:\d{2})/, "$1 / ");
}

export function mapAdditionalPatientInfo(row = {}) {
  const extra =
    row.additional_info && typeof row.additional_info === "object"
      ? row.additional_info
      : {};
  return Object.entries({ ...row, ...extra })
    .filter(([key]) => key !== "additional_info" && !TILE_FIELDS.has(key))
    .map(([key, value]) => ({
      key,
      label: readableLabel(key),
      value: formatValue(key, value),
    }));
}
