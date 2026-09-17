import {
  assertCashCollectionServices,
  normalizeCashCollectionData,
} from "../contracts/cashCollection.contract";
import { runtimeConfig } from "../config/runtimeConfig";
import { createCashCollectionApi } from "../features/cashCollection/services/cashCollectionApi";

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
    let bootstrapData = PROTOTYPE_DATA;

    const [
      { fetchLegacyPendingRequests, createLegacyPendingRequestQueries },
      { fetchLegacyPatientInfo },
    ] = await Promise.all([
      import("./legacyHbimsPendingRequests"),
      import("./legacyHbimsPatientInfo"),
    ]);

    // Live HBIMS data is mandatory for the local integration. If the ticket,
    // backend, or endpoint fails, reject bootstrap and show the error screen;
    // never replace hospital data with prototype patients.
    const liveRequests = await fetchLegacyPendingRequests();
    const loadLiveRequests = async () => liveRequests;

    Object.assign(
      services,
      createLegacyPendingRequestQueries(loadLiveRequests),
    );

    services.getRequest = async (requestId) => {
      const liveRequest = liveRequests.find(
        (row) => row.id === String(requestId),
      );
      if (!liveRequest) return null;
      const linkedPatient = await fetchLegacyPatientInfo(liveRequest.cr);
      return { ...liveRequest, linkedPatient };
    };

    const baseCheckEligibility = services.checkEligibility;
    services.checkEligibility = async (command) => {
      if (command.source === "request") {
        if (liveRequests.some((row) => row.id === String(command.requestId)))
          // No real eligibility endpoint yet — let a live request
          // straight through so its Patient Info tile can be reviewed;
          // the Tariff Details tile stays empty until that endpoint
          // exists.
          return {
            eligible: true,
            code: "ELIGIBLE",
            workflowContext: {},
            patientContextVersion: `live-${command.crNumber}-v1`,
          };
      }
      return baseCheckEligibility(command);
    };

    bootstrapData = {
      ...PROTOTYPE_DATA,
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
