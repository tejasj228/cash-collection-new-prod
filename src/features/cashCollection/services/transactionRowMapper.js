const asDisplayText = (value) => (value == null ? "" : String(value));

// Both transaction tables are read-only views. Keep every value received for
// these rows as display text; numeric calculations derive temporary numbers in
// the page without changing the API model. `department` and `category` power
// the shift dashboard's breakdowns and cross-filters; accept the snake_case
// names a database view may expose, and only surface them when the row
// actually carries a value.
export function mapTransactionRow(row) {
  const base = Object.fromEntries(
    Object.entries(row || {}).map(([field, value]) => [
      field,
      asDisplayText(value),
    ]),
  );
  const department = row?.department ?? row?.department_name;
  const category = row?.category ?? row?.pat_category;
  const requestType =
    row?.requestType ??
    row?.request_type ??
    row?.chargeType ??
    row?.charge_type;
  return {
    ...base,
    ...(department != null ? { department: asDisplayText(department) } : {}),
    ...(category != null ? { category: asDisplayText(category) } : {}),
    ...(requestType != null ? { requestType: asDisplayText(requestType) } : {}),
  };
}
