// Bridge for the teammate's real HBIMS pending-request endpoint. It returns
// raw legacy DB columns (sblnum_chargetype_id, req_type: "Receipt/Service",
// numeric amounts, DD-Mon-YYYY dates) instead of the shape documented in
// docs/api/02-pending-requests.md, so this file translates one to the other.
// Session/env concerns (the SSO ticket, User-Agent, endpoint URL) live in
// utilities/sessionService.js.
import { money, displayDate } from "../shared/utils/formatters";
import {
  queryPendingRequests,
  summarizePendingRequestsByType,
} from "../features/cashCollection/model/pendingRequestsQuery";
import {
  fetchLegacyJson,
  PENDING_REQUESTS_URL,
} from "../utilities/sessionService";

const HOSPITAL_SERVICE_BY_CHARGE_TYPE_ID = {
  1: "OPD",
  4: "OPD",
  2: "IPD",
  3: "Emergency",
};

const MONTH_NUMBER = {
  Jan: "01",
  Feb: "02",
  Mar: "03",
  Apr: "04",
  May: "05",
  Jun: "06",
  Jul: "07",
  Aug: "08",
  Sep: "09",
  Oct: "10",
  Nov: "11",
  Dec: "12",
};

function parseLegacyDate(value) {
  const match = /^(\d{2})-([A-Za-z]{3})-(\d{4})$/.exec(String(value || ""));
  const month = match && MONTH_NUMBER[match[2]];
  if (!month) return { date: String(value || ""), dateIso: "" };
  const dateIso = `${match[3]}-${month}-${match[1]}`;
  return { date: displayDate(dateIso), dateIso };
}

// The query combines two independent values into REQ_TYPE:
//   get_receipt_name(HBLNUM_REQ_TYPE) / getbservicename(...)
// For example, "Refund/Service" must become the canonical queue type
// "Refund". Keeping only the text after the slash incorrectly turns that row
// into a collection. Prefer the raw numeric request kind selected by the same
// query, and retain the text prefix as a compatibility fallback.
function parseLegacyRequestType(row) {
  const text = String(row.req_type || "").trim();
  const slash = text.indexOf("/");
  const operation = (slash === -1 ? "" : text.slice(0, slash))
    .trim()
    .toLowerCase();
  const billingService = (slash === -1 ? text : text.slice(slash + 1)).trim();
  const isRefund =
    Number(row.hblnum_req_type) === 2 || operation.includes("refund");

  if (!isRefund) return billingService;
  return billingService.toLowerCase().includes("advance")
    ? "Advance Refund"
    : "Refund";
}

export function mapLegacyPendingRequestRow(row) {
  const { date, dateIso } = parseLegacyDate(row.req_date);
  const requestTypeLabel = String(row.req_type || "").trim();
  return {
    id: String(row.req_no),
    date,
    dateIso,
    patient: row.pat_name || "",
    department: "",
    category: "",
    cr: String(row.cr_num ?? ""),
    mobile: String(row.mobile_num ?? ""),
    hospitalService:
      HOSPITAL_SERVICE_BY_CHARGE_TYPE_ID[row.sblnum_chargetype_id] || "",
    requestType: parseLegacyRequestType(row),
    requestTypeLabel,
    amount: money(row.req_amount),
    version: "",
  };
}

export async function fetchLegacyPendingRequests() {
  const rows = await fetchLegacyJson(PENDING_REQUESTS_URL);
  return Array.isArray(rows) ? rows.map(mapLegacyPendingRequestRow) : [];
}

// Wraps the bootstrap-loaded live rows so they can stand in for
// the prototype's listPendingRequests/getPendingRequestMetrics without
// duplicating the search/filter/sort/pagination contract those expect.
// The endpoint has no page/size params, so every table interaction reuses the
// single array fetched before the application renders.
export function createLegacyPendingRequestQueries(loadRequests, readRequests) {
  return {
    ...(readRequests
      ? {
          getPendingRequestPageSync: (filters = {}) =>
            queryPendingRequests(readRequests(), filters),
        }
      : {}),
    async listPendingRequests(filters = {}) {
      return queryPendingRequests(await loadRequests(), filters);
    },
    async getPendingRequestMetrics(filters = {}) {
      return summarizePendingRequestsByType(await loadRequests(), filters);
    },
  };
}
