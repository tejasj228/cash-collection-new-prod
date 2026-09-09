import {
  assertCashCollectionServices,
  normalizeCashCollectionData,
} from "../contracts/cashCollection.contract";
import { runtimeConfig } from "../config/runtimeConfig";
import { createCashCollectionApi } from "../features/cashCollection/services/cashCollectionApi";

export async function resolveApplicationRuntime() {
  // Keep the compile-time environment check here so the production Webpack
  // build removes the mock imports and does not publish fixture chunks.
  if (process.env.NODE_ENV === "development" && runtimeConfig.useMocks) {
    const [{ PROTOTYPE_DATA }, { createPrototypeServices }] = await Promise.all(
      [import("../mocks/prototypeData"), import("../mocks/prototypeServices")],
    );
    const services = createPrototypeServices();
    return {
      data: normalizeCashCollectionData(PROTOTYPE_DATA),
      integration: { mode: "prototype", services, events: {} },
    };
  }
  const services = assertCashCollectionServices(
    createCashCollectionApi(runtimeConfig),
  );
  const data = normalizeCashCollectionData(await services.loadBootstrap());
  return { data, integration: { mode: "spring-boot", services, events: {} } };
}
