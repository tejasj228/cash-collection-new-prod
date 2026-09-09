import { createHttpClient } from "../../../services/httpClient";

export function createCashCollectionApi(config) {
  const http = createHttpClient({
    baseUrl: config.apiBaseUrl,
    credentials: config.credentials,
    timeoutMs: config.requestTimeoutMs,
  });
  return Object.freeze({
    loadBootstrap: () => http.request("/bootstrap"),
    searchPatients: (query) =>
      http.request("/patients", {
        query: typeof query === "object" ? query : { query },
      }),
    listPendingRequests: (filters = {}) =>
      http.request("/requests", { query: filters }),
    getRequest: (requestId) =>
      http.request(`/requests/${encodeURIComponent(requestId)}`),
    getTariffs: (filters = {}) => http.request("/tariffs", { query: filters }),
    getPaymentOptions: (context = {}) =>
      http.request("/payment-options", { query: context }),
    checkEligibility: (context) =>
      http.request("/eligibility", { method: "POST", body: context }),
    initiateTerminalPayment: (command) =>
      http.request("/terminal-payments", { method: "POST", body: command }),
    getTerminalPaymentStatus: ({ terminalTransactionId, ...query }) =>
      http.request(
        `/terminal-payments/${encodeURIComponent(terminalTransactionId)}`,
        { query },
      ),
    postTransaction: (command) =>
      http.request("/transactions", {
        method: "POST",
        body: command,
        headers: command.idempotencyKey
          ? { "Idempotency-Key": command.idempotencyKey }
          : undefined,
      }),
    listTransactions: (filters = {}) =>
      http.request("/transactions", { query: filters }),
  });
}
