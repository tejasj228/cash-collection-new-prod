import {
  fetchLegacyJson,
  HOSPITAL_DETAILS_URL,
} from "../utilities/sessionService";

const text = (value) => String(value ?? "").trim();

export function mapLegacyHospitalDetails(row) {
  const hospitalCode = text(row?.hospcode);
  const name = text(row?.hospitalname);
  if (!/^\d+$/.test(hospitalCode) || !name)
    throw new Error("Hospital details are missing hospital code or name.");
  return {
    hospitalCode,
    name,
    shortName: text(row.hospitalshortname),
    subtitle: text(row.hospitalnamehindiunicode),
    address: [text(row.address1), text(row.address2)].filter(Boolean).join(" "),
    city: text(row.city),
    state: text(row.state),
    pincode: text(row.pincode),
    phone: text(row.phone),
    email: text(row.email),
    fax: text(row.fax),
    contactPerson: text(row.contactperson),
    stateCode: text(row.statecode),
  };
}

export async function fetchLegacyHospitalDetails() {
  const payload = await fetchLegacyJson(HOSPITAL_DETAILS_URL);
  if (
    payload?.status !== "success" ||
    !Array.isArray(payload.data) ||
    payload.data.length !== 1
  )
    throw new Error("The server did not return valid hospital details.");
  return mapLegacyHospitalDetails(payload.data[0]);
}
