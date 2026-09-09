import {
  WorkflowFamily,
  RequestChargeType,
  REFUND_REQUEST_CHARGE_TYPES,
} from "../../../contracts/cashCollection.contract";

const isRefundRequest = (request) =>
  Boolean(
    request &&
    (REFUND_REQUEST_CHARGE_TYPES.includes(request.type) ||
      String(request.id).toUpperCase().startsWith("REF")),
  );

const REQUEST_CHARGE_TYPE_ROUTES = Object.freeze({
  [RequestChargeType.OPD_SERVICE]: Object.freeze({
    serviceId: "opd-normal",
    workflowFamily: WorkflowFamily.TARIFF_ENTRY,
  }),
  [RequestChargeType.OPD_REFUND]: Object.freeze({
    serviceId: "opd-normal",
    workflowFamily: WorkflowFamily.SERVICE_REFUND,
  }),
  [RequestChargeType.IPD_ADVANCE_DEPOSIT]: Object.freeze({
    serviceId: "ipd",
    workflowFamily: WorkflowFamily.ACCOUNT_PAYMENT,
  }),
  [RequestChargeType.IPD_ADVANCE_REFUND]: Object.freeze({
    serviceId: "ipd",
    workflowFamily: WorkflowFamily.ADVANCE_REFUND,
  }),
  [RequestChargeType.IPD_FINAL_ADJUSTMENT]: Object.freeze({
    serviceId: "ipd",
    workflowFamily: WorkflowFamily.BILL_SETTLEMENT,
  }),
  [RequestChargeType.INVESTIGATION_CHARGES]: Object.freeze({
    serviceId: "opd-normal",
    workflowFamily: WorkflowFamily.TARIFF_ENTRY,
  }),
  [RequestChargeType.PACKAGE_COLLECTION]: Object.freeze({
    serviceId: "opd-normal",
    workflowFamily: WorkflowFamily.TARIFF_ENTRY,
  }),
});

export { isRefundRequest, REQUEST_CHARGE_TYPE_ROUTES };
