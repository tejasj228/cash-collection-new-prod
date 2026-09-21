// Bridge for the teammate's real HBIMS patient-info endpoint (CR-number
// lookup). It only feeds the Patient Info tile — it returns a handful of
// raw fields, so every other part of the app's Patient model (ward,
// account, episode, admission status, ...) is filled with a dash until a
// fuller patient endpoint exists. Age and sex arrive pre-combined
// ("28 Yr/F"); this splits them so the UI can show one merged "age / sex"
// chip instead of the wire format. Session/env concerns (the SSO ticket,
// User-Agent, endpoint URL) live in utilities/sessionService.js.
import { fetchLegacyJson, PATIENT_INFO_URL } from "../utilities/sessionService";
import { mapAdditionalPatientInfo } from "../shared/utils/patientAdditionalInfo";

const DASH = "-";

// The legacy DB pads some columns with whitespace instead of leaving them
// null, so a plain `value || DASH` can still let a blank-looking chip
// through — trim first so every missing/blank field renders the same "-".
const dashIfBlank = (value) => String(value ?? "").trim() || DASH;

function parseLegacyAgeSex(value) {
  const text = String(value || "");
  const slash = text.indexOf("/");
  if (slash === -1) return { age: DASH, sex: DASH };
  const age = text.slice(0, slash).replace(/[^\d]/g, "") || DASH;
  const sex = dashIfBlank(text.slice(slash + 1));
  return { age, sex };
}

export function mapLegacyPatientInfoRow(row = {}) {
  const { age, sex } = parseLegacyAgeSex(row.pat_age);
  return {
    id: String(row.crno ?? ""),
    name: dashIfBlank(row.pat_name),
    age,
    sex,
    cr: String(row.crno ?? ""),
    ipd: dashIfBlank(row.adm_no),
    account: DASH,
    episode: DASH,
    status: dashIfBlank(row.admission_status),
    isAdmitted:
      typeof row.is_admitted === "boolean" ? row.is_admitted : undefined,
    department: DASH,
    unit: DASH,
    ward: DASH,
    bed: DASH,
    roomType: DASH,
    consultant: DASH,
    admittedOn: DASH,
    category: dashIfBlank(row.category_name),
    mobile: dashIfBlank(row.mobile_num),
    abhaNumber: dashIfBlank(row.abha_num),
    abhaAddress: dashIfBlank(row.abha_address),
    guardianName: dashIfBlank(row["father/mother/spouse name"]),
    patientCategoryCode: dashIfBlank(row.patient_category_code),
    eligibleChargeTypeIds: [],
    accountOpen: false,
    refundableDocumentCount: 0,
    workflowContext: null,
    photoUrl: String(row.photo_url ?? "").trim() || null,
    additionalInfo: mapAdditionalPatientInfo(row),
  };
}

export async function fetchLegacyPatientInfo(crNo) {
  if (!crNo) return null;
  const payload = await fetchLegacyJson(PATIENT_INFO_URL, {
    crNo: String(crNo),
  });
  const row = Array.isArray(payload?.data) ? payload.data[0] : null;
  return row ? mapLegacyPatientInfoRow(row) : null;
}
