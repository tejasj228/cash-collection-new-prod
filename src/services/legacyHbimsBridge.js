export const HBIMS_REQUEST_MODES = Object.freeze({
  Receipt: "OFFRECSER",
  Refund: "OFFREFUNDSER",
  Estimation: "OFFESTIMATION",
});

// The option returned by bootstrap is authoritative. Bill Settlement is a
// configured visible service (35) that posts through the established final
// settlement service (21) in the supplied HBIMS database.
export const HBIMS_PROCESSING_SERVICE_ALIASES = Object.freeze({
  35: "21",
});

export const HBIMS_DEFAULT_PATHS = Object.freeze({
  contextPath: "/HBIMS",
  cashCollectionAction:
    "/billing/transactions/CashCollectionOfflineTransBSCNT.cnt",
});

export const HBIMS_SESSION_POLICY = Object.freeze({
  authoritativeOnServer: Object.freeze([
    "HOSPITAL_CODE",
    "SEATID",
    "IP_ADDR",
    "USER_LEVEL",
  ]),
  sendCredentials: "same-origin",
});

const trimTrailingSlash = (value) =>
  value === "/" ? "" : value.replace(/\/$/, "");

/**
 * Creates the host boundary used by the standalone prototype and the future JSP mount.
 * No network methods are implemented here. HBIMS can inject services later without
 * coupling the React views to Struts, session attributes, or a specific transport.
 */
export function createIntegrationContext(options = {}) {
  const browserOptions =
    typeof window === "undefined"
      ? {}
      : window.HBIMS_CASH_COLLECTION_CONFIG || {};
  const merged = { ...browserOptions, ...options };
  const contextPath = trimTrailingSlash(
    merged.contextPath || HBIMS_DEFAULT_PATHS.contextPath,
  );
  const cashCollectionAction =
    merged.cashCollectionAction || HBIMS_DEFAULT_PATHS.cashCollectionAction;

  return Object.freeze({
    mode: merged.mode || "prototype",
    contextPath,
    endpoints: Object.freeze({
      cashCollection: `${contextPath}${cashCollectionAction}`,
      ...(merged.endpoints || {}),
    }),
    requestModes: HBIMS_REQUEST_MODES,
    sessionPolicy: HBIMS_SESSION_POLICY,
    session: Object.freeze({ ...(merged.session || {}) }),
    services: Object.freeze({ ...(merged.services || {}) }),
    events: Object.freeze({ ...(merged.events || {}) }),
  });
}
