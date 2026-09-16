// Public pending-table API names map to the existing collection workflow model.
// Keep this boundary explicit so patient/detail APIs retain their own contracts.
const asDisplayText = (value) => (value == null ? "" : String(value));

export function mapPendingRequest(row) {
  const reqId = asDisplayText(row.req_id);
  const date = asDisplayText(row.req_date);
  const patient = asDisplayText(row.pat_name);
  const department = asDisplayText(row.department_name);
  const category = asDisplayText(row.category_name);
  const crNumber = asDisplayText(row.cr_num);
  const hospitalService = asDisplayText(row.hospital_service_name);
  const requestType = asDisplayText(row.req_type);
  const amount = asDisplayText(row.req_amount);
  const version = asDisplayText(row.req_version);
  const parts = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date || "");

  return {
    ...row,
    req_id: reqId,
    req_date: date,
    pat_name: patient,
    department_name: department,
    category_name: category,
    cr_num: crNumber,
    hospital_service_name: hospitalService,
    req_type: requestType,
    req_amount: amount,
    req_version: version,
    id: reqId,
    date,
    dateIso: parts
      ? `${parts[3]}-${parts[2]}-${parts[1]}`
      : asDisplayText(row.dateIso),
    patient,
    department,
    category,
    cr: crNumber,
    hospitalService,
    requestType,
    amount,
    version,
  };
}
