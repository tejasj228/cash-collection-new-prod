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

// `serviceId` is always resolved; `workflowFamily` is undefined for a request
// type a real backend sends that isn't one of the known enum values yet.
const resolveRequestRoute = (request) => ({
  serviceId: HOSPITAL_SERVICE_ROUTE_IDS[request?.hospitalService],
  workflowFamily: REQUEST_TYPE_WORKFLOWS[request?.requestType],
});

export {
  isRefundRequest,
  resolveRequestRoute,
  HOSPITAL_SERVICE_ROUTE_IDS,
  REQUEST_TYPE_WORKFLOWS,
};
