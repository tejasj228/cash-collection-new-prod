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
  if (process.env.NODE_ENV === "development" && runtimeConfig.useMocks) {
    const [{ PROTOTYPE_DATA }, { createPrototypeServices }] = await Promise.all(
      [import("../mocks/prototypeData"), import("../mocks/prototypeServices")],
    );
    const services = createPrototypeServices();
    let bootstrapData = PROTOTYPE_DATA;

    if (runtimeConfig.legacyPendingRequestsUrl) {
      const { fetchLegacyPendingRequests, createLegacyPendingRequestQueries } =
        await import("./legacyHbimsPendingRequests");
      const liveRequests = await fetchLegacyPendingRequests(
        runtimeConfig.legacyPendingRequestsUrl,
      );
      Object.assign(services, createLegacyPendingRequestQueries(liveRequests));
      const baseLoadBootstrap = services.loadBootstrap;
      services.loadBootstrap = async () => {
        const base = await baseLoadBootstrap();
        return {
          ...base,
          requests: liveRequests,
          queueSummary: withLiveQueueSummary(
            base.queueSummary,
            liveRequests,
            PROTOTYPE_DATA.todayIso,
          ),
        };
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
    }

    return {
      data: normalizeCashCollectionData(bootstrapData),
      integration: { mode: "prototype", services, events: {} },
    };
  }
  const services = assertCashCollectionServices(
    createCashCollectionApi(runtimeConfig),
  );
  const data = normalizeCashCollectionData(await services.loadBootstrap());
  return { data, integration: { mode: "spring-boot", services, events: {} } };
}
