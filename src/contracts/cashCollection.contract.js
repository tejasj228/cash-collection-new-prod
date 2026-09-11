// Canonical workflow-family identifiers carried in every billing option's
// `uiFamily` field. A legacy HBIMS adapter or the prototype fixtures must use
// exactly these strings so the UI can branch on workflow kind without
// fragile substring matching (`.includes('package')`, etc.).
export const WorkflowFamily = Object.freeze({
  TARIFF_ENTRY: "tariff-entry",
  SERVICE_REFUND: "service-refund",
  ACCOUNT_PAYMENT: "account-payment",
  PACKAGE_ENTRY: "package-entry",
  PACKAGE_REFUND: "package-refund",
  BILL_SETTLEMENT: "bill-settlement",
  BILL_SETTLEMENT_REFUND: "bill-settlement-refund",
  ADVANCE_REFUND: "advance-refund",
  PART_PAYMENT_REFUND: "part-payment-refund",
});

// Canonical "Charge Type" values a billing request can carry in the Pending
// Requests queue — used to classify a request (e.g. is this an IPD Final
// Adjustment or an OPD Refund?) instead of matching substrings of free text.
export const RequestChargeType = Object.freeze({
  OPD_SERVICE: "OPD Service",
  OPD_REFUND: "OPD Refund",
  IPD_ADVANCE_DEPOSIT: "IPD Advance Deposit",
  IPD_ADVANCE_REFUND: "IPD Advance Refund",
  IPD_FINAL_ADJUSTMENT: "IPD Final Adjustment",
  INVESTIGATION_CHARGES: "Investigation Charges",
  PACKAGE_COLLECTION: "Package Collection",
});

export const REFUND_REQUEST_CHARGE_TYPES = Object.freeze([
  RequestChargeType.OPD_REFUND,
  RequestChargeType.IPD_ADVANCE_REFUND,
]);

// The dashboard's "Cash Collected/Refunded by Request Type" breakdown drills
// OPD/IPD/Emergency → billing service, not the Pending-Requests Charge Type
// above (a different, request-queue-specific taxonomy). This mirrors
// `serviceOptions`/`billingByService`: OPD Normal and OPD Special both fold
// into "OPD" (both only ever bill a generic "Service"); Emergency likewise
// only bills "Service"; IPD is the only context with more than one option.
export const HOSPITAL_SERVICE_FAMILY = Object.freeze({
  "opd-normal": "OPD",
  "opd-special": "OPD",
  ipd: "IPD",
  emergency: "Emergency",
});
export const HOSPITAL_SERVICE_FAMILIES = Object.freeze([
  "OPD",
  "IPD",
  "Emergency",
]);
// A billed "Package" is service revenue for this breakdown's purposes — it
// doesn't get its own top-level bucket, it folds into "Service".
export const BILLING_SERVICE_BUCKET = Object.freeze({
  Service: "Service",
  Package: "Service",
  Advance: "Advance",
  "Part Payment": "Part Payment",
  "Bill Settlement": "Bill Settlement",
});
export const BILLING_SERVICES_BY_FAMILY = Object.freeze({
  OPD: Object.freeze(["Service"]),
  IPD: Object.freeze(["Service", "Advance", "Part Payment", "Bill Settlement"]),
  Emergency: Object.freeze(["Service"]),
});

const requiredArrays = [
  "serviceOptions",
  "patients",
  "requests",
  "tariffGroups",
  "tariffCatalog",
  "collectionModes",
  "recentTransactions",
  "recentEstimates",
];

/**
 * Normalizes the read model supplied by either prototype fixtures or HBIMS.
 * This validation is intentionally structural: legacy values are mapped in the
 * backend adapter, while React receives one stable camel-case model.
 */
export function normalizeCashCollectionData(input) {
  if (!input || typeof input !== "object") {
    throw new Error("Cash Collection requires an injected data model.");
  }

  for (const field of requiredArrays) {
    if (!Array.isArray(input[field])) {
      throw new Error(`Cash Collection data.${field} must be an array.`);
    }
  }
  if (!input.todayIso || !/^\d{4}-\d{2}-\d{2}$/.test(input.todayIso)) {
    throw new Error("Cash Collection data.todayIso must use YYYY-MM-DD.");
  }
  if (!input.billingByService || typeof input.billingByService !== "object") {
    throw new Error("Cash Collection data.billingByService is required.");
  }
  if (!input.facility || typeof input.facility.name !== "string") {
    throw new Error("Cash Collection data.facility.name is required.");
  }
  if (!input.serviceOptions.length) {
    throw new Error("Cash Collection requires at least one service option.");
  }
  for (const service of input.serviceOptions) {
    const optionsByRequest = input.billingByService[service.id];
    if (!optionsByRequest || typeof optionsByRequest !== "object") {
      throw new Error(
        `Cash Collection is missing billing options for hospital service ${service.id}.`,
      );
    }
    for (const requestType of ["Receipt", "Refund", "Estimation"]) {
      if (
        !Array.isArray(optionsByRequest[requestType]) ||
        !optionsByRequest[requestType].length
      ) {
        throw new Error(
          `Cash Collection requires ${requestType} billing options for hospital service ${service.id}.`,
        );
      }
      for (const option of optionsByRequest[requestType]) {
        if (
          !option ||
          typeof option !== "object" ||
          option.id == null ||
          !option.label ||
          !option.processingServiceId ||
          !option.uiFamily ||
          !option.legacyMode
        ) {
          throw new Error(
            `Cash Collection ${service.id}/${requestType} billing options must include id, label, processingServiceId, uiFamily and legacyMode.`,
          );
        }
      }
    }
  }
  if (!input.paymentOptions || !Array.isArray(input.paymentOptions.modes)) {
    throw new Error(
      "Cash Collection data.paymentOptions.modes must be an array.",
    );
  }
  if (
    !input.paymentOptions.modes.length ||
    !Array.isArray(input.paymentOptions.cardTypes) ||
    !Array.isArray(input.paymentOptions.posTerminals)
  ) {
    throw new Error("Cash Collection payment options are incomplete.");
  }

  return Object.freeze({
    ...input,
    paymentOptions: Object.freeze({
      cardTypes: [],
      posTerminals: [],
      restrictionsByCategory: {},
      ...input.paymentOptions,
    }),
  });
}

export const CASH_COLLECTION_SERVICE_METHODS = Object.freeze([
  "loadBootstrap",
  "searchPatients",
  "listPendingRequests",
  "getPendingRequestMetrics",
  "getDashboard",
  "getRequest",
  "getTariffs",
  "getPaymentOptions",
  "checkEligibility",
  "initiateTerminalPayment",
  "getTerminalPaymentStatus",
  "postTransaction",
  "listTransactions",
  "prepareShiftClose",
  "closeShift",
  "reopenShift",
]);

export function assertCashCollectionServices(services) {
  const missing = CASH_COLLECTION_SERVICE_METHODS.filter(
    (name) => typeof services?.[name] !== "function",
  );
  if (missing.length) {
    throw new Error(
      `HBIMS Cash Collection is missing service adapters: ${missing.join(", ")}.`,
    );
  }
  return services;
}
