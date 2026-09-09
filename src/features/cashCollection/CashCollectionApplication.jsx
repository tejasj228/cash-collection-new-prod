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
import { SideRail, TopBar } from "./components/layout/Navigation";
import {
  ModeTabs,
  RequestWorklist,
  DirectSelector,
  EstimatesHome,
} from "./components/home/HomeComponents";
import { DirectSetup } from "./components/patient/PatientComponents";
import { CollectionWorkspace } from "./components/workspace/CollectionWorkspace";
import { Confirmation } from "./pages/ConfirmationPage";
import { Overview } from "./pages/OverviewPage";
import Reports from "./pages/ReportsPage";

export default function CashCollectionApplication({
  integration = null,
  data,
}) {
  const appData = useMemo(() => normalizeCashCollectionData(data), [data]);
  const location = useLocation();
  const routeNavigate = useNavigate();
  const {
    serviceOptions,
    patients,
    recentTransactions,
    paymentOptions,
    todayIso,
  } = appData;
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
  const [navCollapsed, setNavCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem("hbims-nav-collapsed") === "1";
    } catch {
      return false;
    }
  });
  const toggleNav = () =>
    setNavCollapsed((value) => {
      const next = !value;
      try {
        window.localStorage.setItem("hbims-nav-collapsed", next ? "1" : "0");
      } catch {
        /* private mode */
      }
      return next;
    });

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
    if (destination === "collection") resetHome();
    else {
      routeNavigate(CASH_COLLECTION_ROUTES[destination]);
      setStage(destination);
    }
  };
  const pageOf = {
    overview: "Overview",
    reports: "Reports",
  };
  const activeNav = pageOf[stage] ? stage : "collection";
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
    resetHome();
    setSelectedPatient(null);
    setCrQuery("");
  };
  const showToast = (message, tone = "success") => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 2600);
  };

  return (
    <AppDataProvider value={appData}>
      <div className="hbims-cash-collection app-shell">
        <SideRail
          active={activeNav}
          onNavigate={navigate}
          collapsed={navCollapsed}
          onToggle={toggleNav}
        />
        <div className="app-main">
          <TopBar page={pageOf[stage] || "Collection"} onNavigate={navigate} />
          <main className="content">
            {stage === "reports" ? (
              <Reports
                transactions={recentTransactions}
                modes={paymentOptions.modes}
                todayIso={todayIso}
              />
            ) : stage === "confirmation" ? (
              <Confirmation
                data={confirmationData}
                onNew={resetHome}
                onPrint={() => window.print()}
              />
            ) : stage === "overview" ? (
              <Overview />
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
        {toast && (
          <div className={`toast ${toast.tone === "error" ? "error" : ""}`}>
            <Icon name={toast.tone === "error" ? "info" : "check"} size={15} />
            {toast.message}
          </div>
        )}
      </div>
    </AppDataProvider>
  );
}
