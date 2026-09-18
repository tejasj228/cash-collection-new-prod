// Everything about the live HBIMS legacy bridge lives here. Application
// code must not assemble backend URLs, tickets, or query parameters itself.
const SSO_TICKET_PARAM = "varSSOTicketGrantingTicket";
const SSO_TICKET_STORAGE_KEY = "hbims_sso_ticket";
const MODE = "1";
const API_BASE_URL = "/api/cash-collection";
const API_CREDENTIALS = "include";
const REQUEST_TIMEOUT_MS = 30000;
const LEGACY_BACKEND_ORIGIN = "http://10.226.28.142:8080";
const PENDING_REQUESTS_PATH = "/cashcollectionreqbased/pendinglist";
const PATIENT_INFO_PATH = "/cashcollectionreqbased/patinfo";
const TARIFF_DETAILS_PATH = "/cashcollectionreqbased/tariffdetails";
const TARIFF_LIST_PATH = "/cashcollectionreqbased/TariffListdetails";
const HOSPITAL_DETAILS_PATH = "/cashcollectionreqbased/hospitaldetails";
const DAILY_PATIENT_LIST_PATH = "/cashcollectionreqbased/dailypatientlist";
const PAYMENT_CATEGORY_MAPPING_PATH =
  "/cashcollectionreqbased/paymentcategorymapping";

// Local CRA development cannot call the teammate's HBIMS host directly
// because that host does not allow cross-origin browser requests. setupProxy
// uses this exported value and forwards /legacy-hbims to it.
function readTicketFromLocation() {
  if (typeof window === "undefined") return "";
  return (
    new URLSearchParams(window.location.search).get(SSO_TICKET_PARAM) || ""
  );
}

let cachedTicket = null;

// HBIMS launches this app with the ticket in the URL's query string (before
// the HashRouter's #). Keep it for this browser tab only; persisting an SSO
// ticket in localStorage would leave it behind after the tab is closed.
function getSsoTicket() {
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

// Useful for diagnostics; runtime activation is controlled by the configured
// endpoint so a missing/expired ticket produces an error instead of silently
// falling back to prototype patient data.
function isLiveSession() {
  return Boolean(getSsoTicket());
}

function getUserAgent() {
  return typeof navigator === "undefined" ? "" : navigator.userAgent;
}

// This app is meant to be served from the same origin as HBIMS itself, so
// in real deployment the backend's paths are already same-origin — nothing
// to configure. The one place that isn't true yet is this local CRA dev
// server (port 3000, a different machine from the teammate's backend);
// src/setupProxy.js proxies /legacy-hbims to that backend for exactly that
// case, so route through it only when running on that dev port.
function resolveBaseOrigin() {
  if (typeof window === "undefined") return "";
  const { origin, port } = window.location;
  return port === "3000" ? `${origin}/legacy-hbims` : origin;
}

const BASE_ORIGIN = resolveBaseOrigin();
const DIRECT_API_URL = `${BASE_ORIGIN}${API_BASE_URL}`;
const PENDING_REQUESTS_URL = `${BASE_ORIGIN}${PENDING_REQUESTS_PATH}`;
const PATIENT_INFO_URL = `${BASE_ORIGIN}${PATIENT_INFO_PATH}`;
const TARIFF_DETAILS_URL = `${BASE_ORIGIN}${TARIFF_DETAILS_PATH}`;
const TARIFF_LIST_URL = `${BASE_ORIGIN}${TARIFF_LIST_PATH}`;
const HOSPITAL_DETAILS_URL = `${BASE_ORIGIN}${HOSPITAL_DETAILS_PATH}`;
const DAILY_PATIENT_LIST_URL = `${BASE_ORIGIN}${DAILY_PATIENT_LIST_PATH}`;
const PAYMENT_CATEGORY_MAPPING_URL = `${BASE_ORIGIN}${PAYMENT_CATEGORY_MAPPING_PATH}`;

// Every legacy HBIMS endpoint wants the same three query params — the SSO
// ticket, a real User-Agent, and mode=1 — plus whatever is specific to that
// one call (e.g. crNo).
function buildLegacyQuery(extraParams = {}) {
  return new URLSearchParams({
    [SSO_TICKET_PARAM]: getSsoTicket(),
    "User-Agent": getUserAgent(),
    mode: MODE,
    ...extraParams,
  });
}

async function fetchLegacyJson(endpointUrl, extraParams = {}) {
  if (!endpointUrl) return null;
  const params = buildLegacyQuery(extraParams);
  const response = await fetch(`${endpointUrl}?${params.toString()}`);
  if (!response.ok)
    throw new Error(`Request to ${endpointUrl} failed (${response.status}).`);
  return response.json();
}

// CommonJS is intentional: CRA's development proxy runs directly in Node,
// while Webpack/Jest also support named imports from this module. This keeps
// the backend origin and every session concern in this single file.
module.exports = {
  API_BASE_URL,
  DIRECT_API_URL,
  API_CREDENTIALS,
  REQUEST_TIMEOUT_MS,
  LEGACY_BACKEND_ORIGIN,
  PENDING_REQUESTS_URL,
  PATIENT_INFO_URL,
  TARIFF_DETAILS_URL,
  TARIFF_LIST_URL,
  HOSPITAL_DETAILS_URL,
  DAILY_PATIENT_LIST_URL,
  PAYMENT_CATEGORY_MAPPING_URL,
  getSsoTicket,
  isLiveSession,
  getUserAgent,
  buildLegacyQuery,
  fetchLegacyJson,
};
