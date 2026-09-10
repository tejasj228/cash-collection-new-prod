import React, { useEffect, useState } from "react";
import {
  WorkflowFamily,
  RequestChargeType,
} from "../../../../contracts/cashCollection.contract";
import { useAppData } from "../../../../app/providers/AppDataProvider";
import { money, firstContextValue } from "../../../../shared/utils/formatters";
import {
  lineGross,
  lineDiscountAmount,
  withKeys,
} from "../../model/chargeCalculations";
import { createIdempotencyKey } from "../../services/idempotency";
import { Icon } from "../../../../shared/components/Icon";
import { PatientBanner } from "../patient/PatientComponents";
import { ChargeBuilder } from "../charges/ChargeBuilder";
import { PrintableBill } from "../print/PrintableBill";
import { TariffDetailsDialog } from "../dialogs/Dialogs";
import { PaymentCard } from "../payment/PaymentCard";
import { AccountWorkflowBuilder } from "./AccountWorkflowBuilder";

function CollectionWorkspace({
  service,
  mode,
  patientMode,
  selectedPatient,
  requestType,
  workflow,
  workflowContext,
  patientContextVersion,
  request,
  onBack,
  onConfirm,
  services,
  onModalVisibilityChange,
}) {
  const { paymentOptions } = useAppData();
  const [paymentMode, setPaymentMode] = useState(paymentOptions.modes[0] || "");
  const [billPayment, setBillPayment] = useState(paymentOptions.modes[0] || "");
  const [receiptNo, setReceiptNo] = useState("Generated after posting");
  const [printDocument, setPrintDocument] = useState(null);
  const [idempotencyKey] = useState(createIdempotencyKey);
  const [workflowSelections, setWorkflowSelections] = useState(() => ({
    raisingDepartmentId: firstContextValue(
      workflowContext?.raisingDepartments,
      selectedPatient?.department,
    ),
    episodeId: firstContextValue(
      workflowContext?.episodes,
      selectedPatient?.episode,
    ),
    patientCategoryId: firstContextValue(
      workflowContext?.patientCategories,
      selectedPatient?.category,
    ),
    wardId: firstContextValue(workflowContext?.wards, selectedPatient?.ward),
    roomTypeId: firstContextValue(
      workflowContext?.roomTypes,
      selectedPatient?.roomType,
    ),
  }));
  const postAndPrint = async (payment) => {
    setBillPayment(payment.summary);
    const command = {
      source: mode,
      requestId: request?.id || null,
      requestVersion: request?.version || null,
      requestType,
      billingServiceId: workflow.id,
      billingServiceName: workflow.label,
      processingBillingServiceId: workflow.processingServiceId,
      workflowId: workflow.uiFamily,
      legacyMode: workflow.legacyMode,
      hospitalServiceId: service.id,
      chargeTypeId: service.legacyChargeTypeId,
      patientId: selectedPatient?.id || null,
      crNumber: selectedPatient?.cr || null,
      patientContextVersion: patientContextVersion || null,
      workflowFields: workflowSelections,
      lines: chosenLines.map(({ key, selected, source, ...line }) => line),
      displayedTotal: total.toFixed(2),
      payment,
      idempotencyKey,
    };
    if (typeof services?.postTransaction !== "function")
      throw new Error("Transaction posting service is unavailable.");
    const result = await services.postTransaction(command);
    const authoritativeNumber = result?.documentNumber;
    if (!authoritativeNumber)
      throw new Error(
        "Transaction response did not include a document number.",
      );
    const printable = result?.printableData;
    if (
      !printable?.patient ||
      !Array.isArray(printable.lines) ||
      !printable.payment ||
      !printable.totals
    ) {
      throw new Error(
        "Transaction response did not include complete printable data.",
      );
    }
    const authoritativeTotal = Number(printable.totals.net);
    if (!Number.isFinite(authoritativeTotal))
      throw new Error(
        "Transaction response contained an invalid authoritative total.",
      );
    setReceiptNo(authoritativeNumber);
    setBillPayment(printable.payment.summary || printable.payment.mode);
    setPrintDocument({
      receiptNo: authoritativeNumber,
      patient: printable.patient,
      lines: withKeys(printable.lines),
      total: authoritativeTotal,
      payment: printable.payment.summary || printable.payment.mode,
      requestType,
      documentDate: printable.documentDate,
    });
    window.setTimeout(() => {
      window.print();
      onConfirm({
        ...command,
        ...result,
        receiptNo: authoritativeNumber,
        patientName: printable.patient.name,
        cr: printable.patient.cr,
        amount: money(authoritativeTotal),
        paymentMode: printable.payment.summary || printable.payment.mode,
      });
    }, 80);
  };
  const usesAccountForm = [
    WorkflowFamily.ACCOUNT_PAYMENT,
    WorkflowFamily.BILL_SETTLEMENT,
    WorkflowFamily.BILL_SETTLEMENT_REFUND,
    WorkflowFamily.ADVANCE_REFUND,
    WorkflowFamily.PART_PAYMENT_REFUND,
  ].includes(workflow.uiFamily);
  const isSettlementWorkflow = [
    WorkflowFamily.BILL_SETTLEMENT,
    WorkflowFamily.BILL_SETTLEMENT_REFUND,
  ].includes(workflow.uiFamily);
  const [lines, setLines] = useState(() => {
    if (request?.lines?.length) return withKeys(request.lines);
    if (!usesAccountForm) return [];
    if (workflowContext?.chargeBreakdown?.length)
      return withKeys(workflowContext.chargeBreakdown);
    if (isSettlementWorkflow) return [];
    const initialAmount = Number(workflowContext?.payableAmount || 0);
    return [
      {
        code: `BS-${workflow.processingServiceId}`,
        name: workflow.label,
        group: "Account",
        rate: initialAmount,
        qty: 1,
        discount: 0,
        key: `BS-${workflow.processingServiceId}-0`,
        source: "server",
        selected: true,
      },
    ];
  });
  const isRequest = mode === "request";
  const chosenLines = lines.filter((line) => line.selected);
  const gross = chosenLines.reduce((sum, line) => sum + lineGross(line), 0);
  const discount = chosenLines.reduce(
    (sum, line) => sum + lineDiscountAmount(line),
    0,
  );
  const total = Math.max(0, gross - discount);
  const [detailsGroup, setDetailsGroup] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  useEffect(() => {
    onModalVisibilityChange?.(Boolean(detailsGroup) || paymentModalOpen);
  }, [detailsGroup, paymentModalOpen, onModalVisibilityChange]);
  useEffect(
    () => () => onModalVisibilityChange?.(false),
    [onModalVisibilityChange],
  );
  // Legacy Tariff Details popup only exists for an IPD Final Adjustment
  // (bill settlement) request raised through the queue — check the request's
  // own Charge Type enum directly rather than the resolved workflow.
  const showTariffDetails =
    isRequest && request?.type === RequestChargeType.IPD_FINAL_ADJUSTMENT;
  const handleDetails = showTariffDetails
    ? (groupLines) => setDetailsGroup(groupLines)
    : undefined;
  const department =
    workflowSelections.raisingDepartmentId ||
    selectedPatient?.department ||
    null;
  const detailsContext = {
    reqNo: request?.id || null,
    reqDate: request?.date || null,
    department,
    paymentMode: paymentMode || null,
    channel: paymentMode === "Cash" ? "Offline" : paymentMode ? "Online" : null,
  };
  return (
    <div className="flow-screen workspace-screen">
      <div className="flow-top">
        <button className="back-link" onClick={onBack}>
          <Icon name="back" size={15} />
          {isRequest ? "Back to Pending Requests" : "Back to Transaction Setup"}
        </button>
      </div>
      <PatientBanner patient={selectedPatient} patientMode={patientMode} />

      <div className="workspace-stack">
        {usesAccountForm ? (
          <AccountWorkflowBuilder
            service={service}
            patient={selectedPatient}
            workflow={workflow}
            requestType={requestType}
            workflowContext={workflowContext}
            selections={workflowSelections}
            setSelections={setWorkflowSelections}
            lines={chosenLines}
            total={total}
            amount={Number(lines[0]?.rate || 0)}
            setAmount={(value) =>
              setLines((current) => [
                {
                  ...(current[0] || {}),
                  code: `BS-${workflow.processingServiceId}`,
                  name: workflow.label,
                  group: "Account",
                  qty: 1,
                  discount: 0,
                  selected: true,
                  key: `BS-${workflow.processingServiceId}-0`,
                  source: "server",
                  rate: value,
                },
              ])
            }
            onDetails={handleDetails}
          />
        ) : (
          <ChargeBuilder
            lines={lines}
            setLines={setLines}
            requestType={requestType}
            mode={mode}
            workflow={workflow}
            onDetails={handleDetails}
          />
        )}
        <PaymentCard
          paymentMode={paymentMode}
          setPaymentMode={setPaymentMode}
          total={total}
          requestType={requestType}
          patient={selectedPatient}
          onConfirm={postAndPrint}
          services={services}
          onModalVisibilityChange={setPaymentModalOpen}
        />
      </div>

      <PrintableBill
        receiptNo={printDocument?.receiptNo || receiptNo}
        patient={printDocument?.patient || selectedPatient}
        lines={printDocument?.lines || chosenLines}
        total={printDocument?.total ?? total}
        payment={printDocument?.payment || billPayment}
        requestType={printDocument?.requestType || requestType}
        documentDate={printDocument?.documentDate}
      />

      {detailsGroup && (
        <TariffDetailsDialog
          lines={detailsGroup}
          context={detailsContext}
          onCancel={() => setDetailsGroup(null)}
        />
      )}
    </div>
  );
}

export { CollectionWorkspace };
