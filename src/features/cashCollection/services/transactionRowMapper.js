const asDisplayText = (value) => (value == null ? "" : String(value));

// Both transaction tables are read-only views. Keep every value received for
// these rows as display text; numeric calculations derive temporary numbers in
// the page without changing the API model. Every public field includes its
// domain prefix, while this mapper exposes the existing compact UI model.
export function mapTransactionRow(row) {
  const base = Object.fromEntries(
    Object.entries(row || {}).map(([field, value]) => [
      field,
      asDisplayText(value),
    ]),
  );
  const transactionNo = row?.transaction_no;
  const patient = row?.pat_name;
  const crNumber = row?.cr_num;
  const dateIso = row?.transaction_date_iso;
  const time = row?.transaction_time;
  const paymentMode = row?.payment_mode;
  const amount = row?.transaction_amount;
  const status = row?.transaction_status;
  const department = row?.department_name;
  const category = row?.category_name;
  const hospitalService = row?.hospital_service_name;
  const billingService = row?.billing_service_name;
  const requestType = row?.req_type;
  return {
    ...base,
    ...(transactionNo != null ? { no: asDisplayText(transactionNo) } : {}),
    ...(patient != null ? { patient: asDisplayText(patient) } : {}),
    ...(crNumber != null ? { cr: asDisplayText(crNumber) } : {}),
    ...(dateIso != null ? { dateIso: asDisplayText(dateIso) } : {}),
    ...(time != null ? { time: asDisplayText(time) } : {}),
    ...(paymentMode != null ? { mode: asDisplayText(paymentMode) } : {}),
    ...(amount != null ? { amount: asDisplayText(amount) } : {}),
    ...(status != null ? { status: asDisplayText(status) } : {}),
    ...(department != null ? { department: asDisplayText(department) } : {}),
    ...(category != null ? { category: asDisplayText(category) } : {}),
    ...(hospitalService != null
      ? { hospitalService: asDisplayText(hospitalService) }
      : {}),
    ...(billingService != null
      ? { billingService: asDisplayText(billingService) }
      : {}),
    ...(requestType != null ? { requestType: asDisplayText(requestType) } : {}),
  };
}
