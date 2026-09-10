import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { normalizeCashCollectionData } from "../../contracts/cashCollection.contract";
import { AppDataProvider } from "../../app/providers/AppDataProvider";
import { optionValue, optionLabel } from "../../shared/utils/formatters";
import {
  isRefundRequest,
  REQUEST_CHARGE_TYPE_ROUTES,
} from "./model/workflowRoutes";
import {
  CASH_COLLECTION_ROUTES,
  sectionFromPath,
} from "./model/navigationRoutes";
import { Icon } from "../../shared/components/Icon";
import { LoaderOverlay } from "../../shared/components/ui";
import { ConfirmModal } from "../../shared/components/ConfirmModal";
import { TopNav } from "./components/layout/Navigation";
import {
  ModeTabs,
  RequestWorklist,
  DirectSelector,
  EstimatesHome,
} from "./components/home/HomeComponents";
import { DirectSetup } from "./components/patient/PatientComponents";
import { CollectionWorkspace } from "./components/workspace/CollectionWorkspace";
import { Confirmation } from "./pages/ConfirmationPage";
import { Dashboard } from "./pages/DashboardPage";
import { ShiftEndDialog } from "./components/dashboard/ShiftEndDialog";
import { ShiftReport } from "./components/dashboard/ShiftReport";
import { computeShiftSummary } from "./model/shiftSummary";
import { createIdempotencyKey } from "./services/idempotency";

function ShiftClosedState() {
  return (
    <div className="shift-ended-state">
      <span className="shift-ended-mark">
        <Icon name="check" size={30} strokeWidth={2.3} />
      </span>
      <h2>Shift ended</h2>
      <p>Use Start Shift in the top navigation to continue cash collection.</p>
    </div>
  );
}

export default function CashCollectionApplication({
  integration = null,
  data,
}) {
  const [appData, setAppData] = useState(() =>
    normalizeCashCollectionData(data),
  );
  useEffect(() => setAppData(normalizeCashCollectionData(data)), [data]);
  const location = useLocation();
  const routeNavigate = useNavigate();
  const { serviceOptions, patients, recentTransactions, todayIso } = appData;
  const billingOptionsFor = (hospitalService, transactionType) =>
    appData.billingByService[hospitalService?.id]?.[transactionType] || [];
  const firstBillingOption = (hospitalService, transactionType = "Receipt") => {
    const first = billingOptionsFor(hospitalService, transactionType)[0];
    return first ? optionValue(first) : "";
  };
  const firstService = serviceOptions[0];
  const [mode, setMode] = useState("request");
  const routeSection = sectionFromPath(location.pathname);
  const routeStage = routeSection === "collection" ? "home" : routeSection;
  const [stage, setStage] = useState(routeStage);
  useEffect(() => setStage(routeStage), [routeStage]);
  const [service, setService] = useState(firstService);
  const [patientMode, setPatientMode] = useState("existing");
  const [requestType, setRequestType] = useState("Receipt");
  const [billingService, setBillingService] = useState(() =>
    firstBillingOption(firstService),
  );
  const [crQuery, setCrQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestSearch, setRequestSearch] = useState("");
  const [confirmationData, setConfirmationData] = useState(null);
  const [workflowContext, setWorkflowContext] = useState(null);
  const [patientContextVersion, setPatientContextVersion] = useState(null);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);

  // Shift state: bill-level patches (e.g. a cancelled bill) and the current
  // counter shift lifecycle.
  const [txPatches, setTxPatches] = useState(() => new Map());
  const [shiftClearedAt, setShiftClearedAt] = useState(null);
  const [endShiftOpen, setEndShiftOpen] = useState(false);
  const [workspaceModalOpen, setWorkspaceModalOpen] = useState(false);
  const [shiftPreparation, setShiftPreparation] = useState(null);
  const [shiftSnapshot, setShiftSnapshot] = useState(null);
  const [restartShiftOpen, setRestartShiftOpen] = useState(false);
  const [restartShiftBusy, setRestartShiftBusy] = useState(false);
  const [restartShiftError, setRestartShiftError] = useState("");
  const [restartIdempotencyKey, setRestartIdempotencyKey] = useState(null);

  const dashboardTransactions = useMemo(
    () =>
      recentTransactions.map((row) =>
        txPatches.has(row.no) ? { ...row, ...txPatches.get(row.no) } : row,
      ),
    [recentTransactions, txPatches],
  );
  const shiftSummaryNow = useMemo(
    () =>
      computeShiftSummary(
        dashboardTransactions.filter((row) => row.dateIso === todayIso),
      ),
    [dashboardTransactions, todayIso],
  );
  const shiftDateLabel = useMemo(
    () =>
      new Date(`${todayIso}T12:00:00`).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    [todayIso],
  );

  const cancelBill = (no) =>
    setTxPatches((current) => {
      const next = new Map(current);
      next.set(no, { status: "Cancelled" });
      return next;
    });
  const openEndShift = async () => {
    setBusy(true);
    try {
      const preparation = await integration.services.prepareShiftClose();
      setShiftPreparation({
        ...preparation,
        closeIdempotencyKey: createIdempotencyKey(),
      });
      setEndShiftOpen(true);
    } catch (error) {
      showToast(
        error.message || "The shift details could not be loaded.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  };
  const confirmEndShift = async (reconciliation) => {
    const result = await integration.services.closeShift({
      shiftId: shiftPreparation.shiftId,
      version: shiftPreparation.version,
      reconciliationMode: reconciliation.reconciliationMode,
      denominations: reconciliation.denominations.map(({ code, quantity }) => ({
        code,
        quantity,
      })),
      idempotencyKey: shiftPreparation.closeIdempotencyKey,
    });
    setShiftSnapshot({
      dateLabel: shiftDateLabel,
      summary: shiftSummaryNow,
      reconciliation: {
        ...reconciliation,
        expectedCash: Number(result.expectedCash),
        countedCash:
          result.countedCash == null ? null : Number(result.countedCash),
      },
      closeResult: result,
    });
    setShiftClearedAt(result.closedAt || new Date().toISOString());
    return result;
  };
  const requestStartNewShift = () => {
    setRestartShiftError("");
    setRestartIdempotencyKey(createIdempotencyKey());
    setRestartShiftOpen(true);
  };
  const startNewShift = async () => {
    setRestartShiftBusy(true);
    setRestartShiftError("");
    try {
      const reopenedShift = await integration.services.reopenShift({
        shiftId: shiftSnapshot.closeResult.shiftId,
        version: shiftSnapshot.closeResult.version,
        idempotencyKey: restartIdempotencyKey,
      });
      const closedBusinessDate =
        shiftSnapshot.closeResult.businessDate || todayIso;
      const reopenedBusinessDate =
        reopenedShift.businessDate || closedBusinessDate;
      const sameBusinessDate = reopenedBusinessDate === closedBusinessDate;
      const refreshedData = normalizeCashCollectionData(
        await integration.services.loadBootstrap(),
      );
      setAppData(
        !sameBusinessDate && refreshedData.todayIso !== reopenedBusinessDate
          ? normalizeCashCollectionData({
              ...refreshedData,
              todayIso: reopenedBusinessDate,
              recentTransactions: [],
              requests: [],
              queueSummary: {
                ...refreshedData.queueSummary,
                pendingCount: 0,
                todayPendingCount: 0,
              },
            })
          : refreshedData,
      );
      if (!sameBusinessDate) setTxPatches(new Map());
      setShiftClearedAt(null);
      setShiftSnapshot(null);
      setRestartShiftOpen(false);
      resetHome();
    } catch (error) {
      setRestartShiftError(
        error.message || "The shift could not be started again.",
      );
    } finally {
      setRestartShiftBusy(false);
    }
  };

  const resetHome = () => {
    routeNavigate(CASH_COLLECTION_ROUTES.collection);
    setStage("home");
    setMode("request");
    setConfirmationData(null);
    setSelectedRequest(null);
    setWorkflowContext(null);
    setPatientContextVersion(null);
    setPatientMode("existing");
    setRequestType("Receipt");
    setBillingService(firstBillingOption(firstService));
  };
  const changeMode = (nextMode) => {
    setMode(nextMode);
    setStage("home");
    setSelectedRequest(null);
    if (nextMode === "direct") {
      setService(firstService);
      setRequestType("Receipt");
      setBillingService(firstBillingOption(firstService));
    }
  };
  const chooseService = (nextService) => {
    setService(nextService);
    setBillingService(firstBillingOption(nextService, requestType));
    setStage("setup");
    setPatientMode("existing");
    setSelectedPatient(null);
    setCrQuery("");
    setSelectedRequest(null);
  };
  const openRequest = async (request) => {
    if (!request) return;
    setBusy(true);
    try {
      await openRequestFlow(request);
    } finally {
      setBusy(false);
    }
  };
  const openRequestFlow = async (request) => {
    let requestDetail;
    try {
      requestDetail = await integration.services.getRequest(request.id);
    } catch (error) {
      showToast(
        error.message || "The request details could not be loaded.",
        "error",
      );
      return;
    }
    if (!requestDetail) {
      showToast("This request is no longer available.", "error");
      return;
    }
    const resolvedRequest = { ...request, ...requestDetail };
    const patient =
      requestDetail.linkedPatient ||
      patients.find((item) => item.cr === resolvedRequest.cr);
    if (!patient) {
      showToast(
        "The patient linked to this request could not be loaded.",
        "error",
      );
      return;
    }
    // Resolve service + workflow from the request's Charge Type enum first;
    // fall back to the old label-matching heuristic only for a charge type a
    // real backend sends that isn't one of our known enum values yet.
    const route = REQUEST_CHARGE_TYPE_ROUTES[resolvedRequest.type];
    const nextService = route
      ? serviceOptions.find((option) => option.id === route.serviceId) ||
        firstService
      : resolvedRequest.type.includes("IPD")
        ? serviceOptions.find((option) => option.id === "ipd") || firstService
        : resolvedRequest.type.includes("Emergency")
          ? serviceOptions.find((option) => option.id === "emergency") ||
            firstService
          : firstService;
    const nextRequestType = isRefundRequest(resolvedRequest)
      ? "Refund"
      : "Receipt";
    const options = billingOptionsFor(nextService, nextRequestType);
    let workflow;
    if (route) {
      workflow =
        options.find((option) => option.uiFamily === route.workflowFamily) ||
        options[0];
    } else {
      const requestKey = resolvedRequest.type
        .toLowerCase()
        .replace(/[^a-z]/g, "");
      workflow =
        options.find((option) =>
          requestKey.includes(
            optionLabel(option)
              .toLowerCase()
              .replace(/[^a-z]/g, ""),
          ),
        ) || options[0];
    }
    try {
      if (typeof integration?.services?.checkEligibility !== "function")
        throw new Error("Patient eligibility service is unavailable.");
      const eligibility = await integration.services.checkEligibility({
        source: "request",
        requestId: resolvedRequest.id,
        requestVersion: resolvedRequest.version || null,
        patientId: patient.id,
        crNumber: resolvedRequest.cr,
        hospitalServiceId: nextService.id,
        chargeTypeId: nextService.legacyChargeTypeId,
        requestType: nextRequestType,
        billingServiceId: workflow?.id,
        processingBillingServiceId: workflow?.processingServiceId,
        workflowId: workflow?.uiFamily,
      });
      if (!eligibility?.eligible) {
        showToast(
          eligibility?.message ||
            "This request is no longer eligible for collection.",
          "error",
        );
        return;
      }
      setWorkflowContext(eligibility.workflowContext || null);
      setPatientContextVersion(eligibility.patientContextVersion || null);
    } catch (error) {
      showToast(
        error.message || "Request eligibility could not be verified.",
        "error",
      );
      return;
    }
    setMode("request");
    setPatientMode("existing");
    setSelectedRequest(resolvedRequest);
    setSelectedPatient(patient);
    setService(nextService);
    setRequestType(nextRequestType);
    setBillingService(workflow ? optionValue(workflow) : "");
    setStage("workspace");
  };
  const startEstimate = () => {
    routeNavigate(CASH_COLLECTION_ROUTES.collection);
    setMode("direct");
    setStage("home");
    setSelectedRequest(null);
    setPatientMode("existing");
    setService(firstService);
    setRequestType("Estimation");
    setBillingService(firstBillingOption(firstService, "Estimation"));
  };
  const navigate = (destination) => {
    if (destination === "dashboard") {
      routeNavigate(CASH_COLLECTION_ROUTES.dashboard);
      setStage("dashboard");
    } else {
      resetHome();
    }
  };
  const activeNav = stage === "dashboard" ? "dashboard" : "collection";
  const continueSetup = (eligibility) => {
    setWorkflowContext(eligibility?.workflowContext || null);
    setPatientContextVersion(eligibility?.patientContextVersion || null);
    setStage("workspace");
  };
  const selectedWorkflow =
    billingOptionsFor(service, requestType).find(
      (option) => optionValue(option) === String(billingService),
    ) || billingOptionsFor(service, requestType)[0];
  const confirm = (transaction) => {
    integration?.events?.onTransactionConfirmed?.(transaction);
    if (transaction?.dashboardTransaction || transaction?.resolvedRequestId) {
      setAppData((current) => {
        const requests = transaction.resolvedRequestId
          ? current.requests.filter(
              (request) => request.id !== transaction.resolvedRequestId,
            )
          : current.requests;
        return normalizeCashCollectionData({
          ...current,
          requests,
          recentTransactions: transaction.dashboardTransaction
            ? [
                transaction.dashboardTransaction,
                ...current.recentTransactions.filter(
                  (row) => row.no !== transaction.dashboardTransaction.no,
                ),
              ]
            : current.recentTransactions,
          queueSummary: {
            ...current.queueSummary,
            pendingCount: requests.length,
            todayPendingCount: requests.filter(
              (request) => request.dateIso === current.todayIso,
            ).length,
          },
        });
      });
    }
    resetHome();
    setSelectedPatient(null);
    setCrQuery("");
    void integration?.services
      ?.loadBootstrap?.()
      .then((nextData) => setAppData(normalizeCashCollectionData(nextData)))
      .catch(() => {
        showToast(
          "The transaction was completed, but the latest dashboard data could not be refreshed.",
          "error",
        );
      });
  };
  const showToast = (message, tone = "success") => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 2600);
  };

  return (
    <AppDataProvider value={appData}>
      <div
        className={`hbims-cash-collection app-shell ${endShiftOpen || workspaceModalOpen ? "shift-dialog-open" : ""}`}
      >
        <TopNav
          active={activeNav}
          onNavigate={navigate}
          onEndShift={shiftClearedAt ? requestStartNewShift : openEndShift}
          shiftEnded={Boolean(shiftClearedAt)}
        />
        <div className="app-main">
          <main className="content">
            {stage === "dashboard" ? (
              <Dashboard
                transactions={dashboardTransactions}
                onCancelBill={cancelBill}
              />
            ) : shiftClearedAt ? (
              <ShiftClosedState />
            ) : stage === "confirmation" ? (
              <Confirmation
                data={confirmationData}
                onNew={resetHome}
                onPrint={() => window.print()}
              />
            ) : stage === "estimates" ? (
              <EstimatesHome onCreate={startEstimate} />
            ) : stage === "setup" ? (
              <DirectSetup
                service={service}
                onBack={() => setStage("home")}
                onContinue={continueSetup}
                requestType={requestType}
                setRequestType={setRequestType}
                billingService={billingService}
                setBillingService={setBillingService}
                crQuery={crQuery}
                setCrQuery={setCrQuery}
                selectedPatient={selectedPatient}
                setSelectedPatient={setSelectedPatient}
                services={integration?.services}
                onModalVisibilityChange={setWorkspaceModalOpen}
              />
            ) : stage === "workspace" && selectedWorkflow ? (
              <CollectionWorkspace
                service={service}
                mode={mode}
                patientMode={patientMode}
                selectedPatient={selectedPatient}
                requestType={requestType}
                workflow={selectedWorkflow}
                workflowContext={workflowContext}
                patientContextVersion={patientContextVersion}
                request={mode === "request" ? selectedRequest : null}
                onBack={() =>
                  mode === "direct" ? setStage("setup") : setStage("home")
                }
                onConfirm={confirm}
                services={integration?.services}
                onModalVisibilityChange={setWorkspaceModalOpen}
              />
            ) : (
              <>
                <ModeTabs mode={mode} onChange={changeMode} />
                {mode === "request" ? (
                  <RequestWorklist
                    onCollect={openRequest}
                    search={requestSearch}
                    setSearch={setRequestSearch}
                    services={integration.services}
                  />
                ) : (
                  <DirectSelector
                    onSelect={chooseService}
                    transactionType={requestType}
                  />
                )}
              </>
            )}
          </main>
        </div>
        {busy && <LoaderOverlay label="Opening request…" />}
        {toast && (
          <div className={`toast ${toast.tone === "error" ? "error" : ""}`}>
            <Icon name={toast.tone === "error" ? "info" : "check"} size={15} />
            {toast.message}
          </div>
        )}
        {endShiftOpen && (
          <ShiftEndDialog
            summary={shiftSummaryNow}
            dateLabel={shiftDateLabel}
            preparation={shiftPreparation}
            onConfirm={confirmEndShift}
            onClose={() => {
              setEndShiftOpen(false);
              setShiftPreparation(null);
            }}
          />
        )}
        {restartShiftOpen && (
          <ConfirmModal
            icon="power"
            title="Start shift again?"
            lead={`You already ended a shift for ${shiftDateLabel}. Start another segment for emergency or additional same-day collections.`}
            rows={[
              [
                "Previously submitted cash",
                `₹${Number(shiftSnapshot?.closeResult?.cumulativeCash || shiftSnapshot?.closeResult?.expectedCash || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              ],
            ]}
            confirmLabel={restartShiftBusy ? "Starting…" : "Yes, start shift"}
            cancelLabel="Cancel"
            busy={restartShiftBusy}
            onConfirm={startNewShift}
            onCancel={() => setRestartShiftOpen(false)}
            content={
              restartShiftError ? (
                <p className="cash-reconcile-message error" role="alert">
                  {restartShiftError}
                </p>
              ) : null
            }
          />
        )}
        <ShiftReport snapshot={shiftSnapshot} />
      </div>
    </AppDataProvider>
  );
}
