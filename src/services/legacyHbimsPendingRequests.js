// Bridge for the teammate's real HBIMS pending-request endpoint. It returns
// raw legacy DB columns (sblnum_chargetype_id, req_type: "Receipt/Service",
// numeric amounts, DD-Mon-YYYY dates) instead of the shape documented in
// docs/api/02-pending-requests.md, so this file translates one to the other.
// It also carries the varSSOTicketGrantingTicket the HBIMS shell launches
// this app with (query string, before the HashRouter's #) since this
// endpoint authenticates via that ticket rather than a session cookie.
import { money, displayDate } from "../shared/utils/formatters";
import {
  queryPendingRequests,
  summarizePendingRequestsByType,
} from "../features/cashCollection/model/pendingRequestsQuery";

const SSO_TICKET_PARAM = "varSSOTicketGrantingTicket";
const SSO_TICKET_STORAGE_KEY = "hbims_sso_ticket";

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

// The backend combines the command type and the queue's own request type
// into one string, e.g. "Receipt/Service" or "Refund/Advance Refund" — only
// the part after the slash is the RequestType enum value we display/filter.
function parseLegacyRequestType(value) {
  const text = String(value || "");
  const slash = text.indexOf("/");
  return slash === -1 ? text : text.slice(slash + 1);
}

export function mapLegacyPendingRequestRow(row) {
  const { date, dateIso } = parseLegacyDate(row.req_date);
  return {
    id: String(row.req_no),
    date,
    dateIso,
    patient: row.pat_name || "",
    department: "",
    category: "",
    cr: String(row.cr_num ?? ""),
    hospitalService:
      HOSPITAL_SERVICE_BY_CHARGE_TYPE_ID[row.sblnum_chargetype_id] || "",
    requestType: parseLegacyRequestType(row.req_type),
    amount: money(row.req_amount),
    version: "",
  };
}

function readTicketFromLocation() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(SSO_TICKET_PARAM) || "";
}

let cachedTicket = null;

export function getSsoTicket() {
  if (cachedTicket) return cachedTicket;
  const fromUrl = readTicketFromLocation();
  if (fromUrl) {
    cachedTicket = fromUrl;
    try {
      window.sessionStorage.setItem(SSO_TICKET_STORAGE_KEY, fromUrl);
    } catch {
      // Storage can be unavailable (private browsing); the in-memory cache
      // still covers the rest of this page's lifetime.
    }
    return cachedTicket;
  }
  try {
    cachedTicket = window.sessionStorage.getItem(SSO_TICKET_STORAGE_KEY) || "";
  } catch {
    cachedTicket = "";
  }
  return cachedTicket;
}

export async function fetchLegacyPendingRequests(endpointUrl) {
  if (!endpointUrl) return [];
  const params = new URLSearchParams({
    [SSO_TICKET_PARAM]: getSsoTicket(),
    "User-Agent": typeof navigator === "undefined" ? "" : navigator.userAgent,
    mode: "1",
  });
  const response = await fetch(`${endpointUrl}?${params.toString()}`);
  if (!response.ok)
    throw new Error(`Pending request queue failed to load (${response.status}).`);
  const rows = await response.json();
  return Array.isArray(rows) ? rows.map(mapLegacyPendingRequestRow) : [];
}

// Wraps the already-fetched live rows so they can stand in for the
// prototype's listPendingRequests/getPendingRequestMetrics without
// duplicating the search/filter/sort/pagination contract those expect.
export function createLegacyPendingRequestQueries(requests) {
  return {
    async listPendingRequests(filters = {}) {
      return queryPendingRequests(requests, filters);
    },
    async getPendingRequestMetrics(filters = {}) {
      return summarizePendingRequestsByType(requests, filters);
    },
  };
}
