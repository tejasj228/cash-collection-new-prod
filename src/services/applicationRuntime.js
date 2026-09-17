import {
  assertCashCollectionServices,
  normalizeCashCollectionData,
} from "../contracts/cashCollection.contract";
import { runtimeConfig } from "../config/runtimeConfig";
import { DIRECT_API_URL } from "../utilities/sessionService";
import { createCashCollectionApi } from "../features/cashCollection/services/cashCollectionApi";
import { createPendingListPatientQueries } from "./legacyHbimsDirectPatients";
import { directPatientError } from "../features/cashCollection/Collection/Direct/direct";
import { fetchLegacyPaymentOptions } from "./legacyHbimsPaymentOptions";

function withLiveQueueSummary(queueSummary, liveRequests, todayIso) {
  return {
    ...queueSummary,
    pendingCount: liveRequests.length,
    todayPendingCount: liveRequests.filter((row) => row.dateIso === todayIso)
      .length,
  };
}

export async function resolveApplicationRuntime() {
  // Keep the compile-time environment check here so the production Webpack
  // build removes the mock imports and does not publish fixture chunks.
  if (process.env.NODE_ENV === "development") {
    const [{ PROTOTYPE_DATA }, { createPrototypeServices }] = await Promise.all(
      [import("../mocks/prototypeData"), import("../mocks/prototypeServices")],
    );
    const services = createPrototypeServices();
    const directApi = createCashCollectionApi({
      ...runtimeConfig,
      apiBaseUrl: DIRECT_API_URL,
    });
    services.getTariffPage = directApi.getTariffPage;
    services.getTariffs = directApi.getTariffs;
    services.getPaymentOptions = fetchLegacyPaymentOptions;
    let bootstrapData = PROTOTYPE_DATA;

    const [
      { fetchLegacyPendingRequests, createLegacyPendingRequestQueries },
      { fetchLegacyPatientInfo },
      { fetchLegacyTariffDetails },
    ] = await Promise.all([
      import("./legacyHbimsPendingRequests"),
      import("./legacyHbimsPatientInfo"),
      import("./legacyHbimsTariffDetails"),
    ]);

    // Live HBIMS data is mandatory for the local integration. If the ticket,
    // backend, or endpoint fails, reject bootstrap and show the error screen;
    // never replace hospital data with prototype patients.
    const liveRequests = await fetchLegacyPendingRequests();
    const loadLiveRequests = async () => liveRequests;
    Object.assign(
      services,
      createPendingListPatientQueries(loadLiveRequests, fetchLegacyPatientInfo),
    );
    services.patientSource = "pending-list";
    services.searchPatients = async (options) =>
      (await services.searchPatientPage(options)).items;

    Object.assign(
      services,
      createLegacyPendingRequestQueries(loadLiveRequests),
    );

    services.getRequest = async (requestId) => {
      const liveRequest = liveRequests.find(
        (row) => row.id === String(requestId),
      );
      if (!liveRequest) return null;
      const needsTariffs = !["Advance Deposit", "Advance Refund"].includes(
        liveRequest.requestType,
      );
      const [linkedPatient, lines] = await Promise.all([
        fetchLegacyPatientInfo(liveRequest.cr),
        needsTariffs
          ? fetchLegacyTariffDetails(liveRequest.id, liveRequest.cr)
          : Promise.resolve([]),
      ]);
      return { ...liveRequest, linkedPatient, lines };
    };

    services.checkEligibility = async (command) => {
      if (command.source === "request") {
        if (liveRequests.some((row) => row.id === String(command.requestId)))
          // No real eligibility endpoint yet — let a live request
          // straight through so its Patient Info tile can be reviewed;
          // getRequest loads tariffs separately; tariff data is not
          // evidence of backend eligibility or permission to post.
          return {
            eligible: true,
            code: "ELIGIBLE",
            workflowContext: {},
            patientContextVersion: `live-${command.crNumber}-v1`,
          };
      }
      if (command.source === "direct") {
        const result = await services.searchPatientPage({
          query: String(command.crNumber),
          exactCr: true,
          hospitalServiceId: command.hospitalServiceId,
        });
        const patient = result.items[0];
        if (!patient)
          return {
            eligible: false,
            code: "PATIENT_NOT_FOUND",
            message:
              "No matching pending-list patient was found for this service.",
          };
        const admissionError = directPatientError(patient, {
          id: command.hospitalServiceId,
        });
        if (admissionError)
          return {
            eligible: false,
            code: "HOSPITAL_SERVICE_MISMATCH",
            message: admissionError,
          };
        const workflow = PROTOTYPE_DATA.billingByService[
          command.hospitalServiceId
        ]?.[command.requestType]?.find(
          (option) =>
            String(option.id) === String(command.billingServiceId) &&
            option.uiFamily === command.workflowId,
        );
        if (!workflow || workflow.legacyMode === "SERVER_RESOLVED")
          return {
            eligible: false,
            code: "WORKFLOW_NOT_ALLOWED",
            message: "This workflow is not available for this service.",
          };
        // Allows tariff configuration only, not proof of backend financial eligibility.
        return {
          eligible: true,
          code: "PENDING_LIST_CONFIGURE",
          workflowContext: {},
          patientContextVersion: null,
        };
      }
      return directApi.checkEligibility(command);
    };

    bootstrapData = {
      ...PROTOTYPE_DATA,
      patients: [],
      tariffCatalog: [],
      tariffGroups: [],
      requests: liveRequests,
      queueSummary: withLiveQueueSummary(
        PROTOTYPE_DATA.queueSummary,
        liveRequests,
        PROTOTYPE_DATA.todayIso,
      ),
    };

    return {
      data: normalizeCashCollectionData(bootstrapData),
      integration: { mode: "legacy-hbims", services, events: {} },
    };
  }
  const services = assertCashCollectionServices(
    createCashCollectionApi(runtimeConfig),
  );
  const data = normalizeCashCollectionData(await services.loadBootstrap());
  return { data, integration: { mode: "spring-boot", services, events: {} } };
}
