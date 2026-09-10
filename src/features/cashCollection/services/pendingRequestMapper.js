// Public pending-table API names map to the existing collection workflow model.
// Keep this boundary explicit so patient/detail APIs retain their own contracts.
const asDisplayText = (value) => (value == null ? "" : String(value));

export function mapPendingRequest(row) {
  const reqId = asDisplayText(row.req_id ?? row.id);
  const date = asDisplayText(row.req_date ?? row.date);
  const patient = asDisplayText(row.pat_name ?? row.patient);
  const department = asDisplayText(row.department_name ?? row.department);
  const category = asDisplayText(row.category_name ?? row.category);
  const crNumber = asDisplayText(row.cr_num ?? row.cr);
  const chargeType = asDisplayText(row.charge_type ?? row.type);
  const amount = asDisplayText(row.amount);
  const version = asDisplayText(row.version);
  const parts = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date || "");

  return {
    ...row,
    req_id: reqId,
    req_date: date,
    pat_name: patient,
    department_name: department,
    category_name: category,
    cr_num: crNumber,
    charge_type: chargeType,
    amount,
    version,
    id: reqId,
    date,
    dateIso: parts
      ? `${parts[3]}-${parts[2]}-${parts[1]}`
      : asDisplayText(row.dateIso),
    patient,
    department,
    category,
    cr: crNumber,
    type: chargeType,
  };
}
