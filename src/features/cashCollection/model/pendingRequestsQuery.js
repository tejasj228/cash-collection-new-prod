// Pure filter/sort/paginate logic for an in-memory pending-request list.
// Shared by the design-review prototype service and any live data source
// (e.g. a backend endpoint that returns the full queue unpaginated) so both
// honour the same search/filter/sort contract the UI already relies on.

export function queryPendingRequests(
  allRequests,
  {
    page = 0,
    size = 10,
    search = "",
    hospitalService,
    requestType,
    department,
    category,
    date,
    sort,
  } = {},
) {
  const term = String(search).trim().toLowerCase();
  let items = allRequests.filter(
    (row) =>
      (!term ||
        `${row.patient} ${row.cr} ${row.id}`.toLowerCase().includes(term)) &&
      (!hospitalService || row.hospitalService === hospitalService) &&
      (!requestType || row.requestType === requestType) &&
      (!department || row.department === department) &&
      (!category || row.category === category) &&
      (!date || row.dateIso === date),
  );
  if (sort) {
    const [field, direction] = String(sort).split(",");
    const value =
      field === "amount"
        ? (row) => Number(String(row.amount).replace(/,/g, ""))
        : (row) => row.dateIso;
    items = [...items].sort(
      (left, right) =>
        (value(left) > value(right) ? 1 : value(left) < value(right) ? -1 : 0) *
        (direction === "desc" ? -1 : 1),
    );
  }
  const start = Number(page) * Number(size);
  return {
    items: items.slice(start, start + Number(size)),
    total: items.length,
    page: Number(page),
    size: Number(size),
  };
}

export function summarizePendingRequestsByType(
  allRequests,
  { date, category, department, hospitalService, requestType } = {},
) {
  const rows = allRequests.filter(
    (row) =>
      (!date || row.dateIso === date) &&
      (!category || row.category === category) &&
      (!department || row.department === department) &&
      (!hospitalService || row.hospitalService === hospitalService) &&
      (!requestType || row.requestType === requestType),
  );
  const counts = rows.reduce((map, row) => {
    const key = `${row.hospitalService}::${row.requestType}`;
    const current = map.get(key) || {
      hospitalService: row.hospitalService,
      requestType: row.requestType,
      count: 0,
    };
    current.count += 1;
    map.set(key, current);
    return map;
  }, new Map());
  return {
    total: rows.length,
    byRequestType: [...counts.values()].sort(
      (left, right) => right.count - left.count,
    ),
  };
}
