const browserConfig =
  typeof window === "undefined"
    ? {}
    : window.HBIMS_CASH_COLLECTION_CONFIG || {};

export const runtimeConfig = Object.freeze({
  apiBaseUrl:
    browserConfig.apiBaseUrl ||
    process.env.REACT_APP_API_BASE_URL ||
    "/api/cash-collection",
  credentials: browserConfig.credentials || "include",
  requestTimeoutMs: Number(
    browserConfig.requestTimeoutMs ||
      process.env.REACT_APP_REQUEST_TIMEOUT_MS ||
      30000,
  ),
  useMocks:
    process.env.NODE_ENV === "development" &&
    process.env.REACT_APP_USE_MOCKS === "true",
});
