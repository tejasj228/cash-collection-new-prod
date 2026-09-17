import {
  WorkflowFamily,
  HospitalService,
  RequestType,
  REFUND_REQUEST_TYPES,
} from "../../../contracts/cashCollection.contract";

const isRefundRequest = (request) =>
  Boolean(
    request &&
    (REFUND_REQUEST_TYPES.includes(request.requestType) ||
      // A live backend row's requestType isn't split down to the bare enum
      // value (e.g. "Refund/Advance Refund"), so also catch it by substring.
      String(request.requestType || "")
        .toLowerCase()
        .includes("refund") ||
      String(request.id).toUpperCase().startsWith("REF")),
  );

// A request's Hospital Service decides which service tile it opens under; OPD
// requests always open as OPD Normal — the queue does not distinguish Special.
const HOSPITAL_SERVICE_ROUTE_IDS = Object.freeze({
  [HospitalService.OPD]: "opd-normal",
  [HospitalService.IPD]: "ipd",
  [HospitalService.EMERGENCY]: "emergency",
});

const REQUEST_TYPE_WORKFLOWS = Object.freeze({
  [RequestType.SERVICE]: WorkflowFamily.TARIFF_ENTRY,
  [RequestType.REFUND]: WorkflowFamily.SERVICE_REFUND,
  [RequestType.ADVANCE_DEPOSIT]: WorkflowFamily.ACCOUNT_PAYMENT,
  [RequestType.ADVANCE_REFUND]: WorkflowFamily.ADVANCE_REFUND,
  [RequestType.FINAL_ADJUSTMENT]: WorkflowFamily.BILL_SETTLEMENT,
  [RequestType.INVESTIGATION_CHARGES]: WorkflowFamily.TARIFF_ENTRY,
  [RequestType.PACKAGE_COLLECTION]: WorkflowFamily.TARIFF_ENTRY,
});

// Longest enum value first, so "Advance Refund" is checked before the more
// generic "Refund" it also contains.
const REQUEST_TYPE_KEYS_BY_LENGTH = Object.keys(REQUEST_TYPE_WORKFLOWS).sort(
  (left, right) => right.length - left.length,
);

// A live backend row's requestType is shown exactly as sent, e.g.
// "Receipt/Final Adjustment" rather than the bare enum value, so fall back
// to a substring match against the known RequestType values.
const workflowFamilyFor = (requestType) => {
  if (REQUEST_TYPE_WORKFLOWS[requestType])
    return REQUEST_TYPE_WORKFLOWS[requestType];
  const value = String(requestType || "");
  const match = REQUEST_TYPE_KEYS_BY_LENGTH.find((key) => value.includes(key));
  return match ? REQUEST_TYPE_WORKFLOWS[match] : undefined;
};

// `serviceId` is always resolved; `workflowFamily` is undefined for a request
// type a real backend sends that isn't one of the known enum values yet.
const resolveRequestRoute = (request) => ({
  serviceId: HOSPITAL_SERVICE_ROUTE_IDS[request?.hospitalService],
  workflowFamily: workflowFamilyFor(request?.requestType),
});

export {
  isRefundRequest,
  resolveRequestRoute,
  HOSPITAL_SERVICE_ROUTE_IDS,
  REQUEST_TYPE_WORKFLOWS,
};
