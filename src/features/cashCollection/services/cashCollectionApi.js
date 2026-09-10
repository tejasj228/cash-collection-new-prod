import { createHttpClient } from "../../../services/httpClient";
import { mapPendingRequest } from "./pendingRequestMapper";
import { mapTransactionRow } from "./transactionRowMapper";
import {
  normalizeClosedShift,
  normalizeShiftClosePreparation,
} from "./shiftApiModels";

export function createCashCollectionApi(config) {
  const http = createHttpClient({
    baseUrl: config.apiBaseUrl,
    credentials: config.credentials,
    timeoutMs: config.requestTimeoutMs,
  });
  return Object.freeze({
    loadBootstrap: async () => {
      const data = await http.request("/bootstrap");
      return {
        ...data,
        ...(Array.isArray(data.requests)
          ? { requests: data.requests.map(mapPendingRequest) }
          : {}),
        ...(Array.isArray(data.recentTransactions)
          ? {
              recentTransactions:
                data.recentTransactions.map(mapTransactionRow),
            }
          : {}),
      };
    },
    searchPatients: (query) =>
      http.request("/patients", {
        query: typeof query === "object" ? query : { query },
      }),
    listPendingRequests: async (filters = {}) => {
      const data = await http.request("/requests", { query: filters });
      return { ...data, items: (data.items || []).map(mapPendingRequest) };
    },
    getPendingRequestMetrics: (filters = {}) =>
      http.request("/dashboard/pending-metrics", { query: filters }),
    getDashboard: (filters = {}) =>
      http.request("/dashboard", { query: filters }),
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
    listTransactions: async (filters = {}) => {
      const data = await http.request("/transactions", { query: filters });
      return { ...data, items: (data.items || []).map(mapTransactionRow) };
    },
    prepareShiftClose: async () =>
      normalizeShiftClosePreparation(
        await http.request("/shifts/current/close-preparation"),
      ),
    closeShift: async (command) =>
      normalizeClosedShift(
        await http.request(
          `/shifts/${encodeURIComponent(command.shiftId)}/close`,
          {
            method: "POST",
            body: {
              version: command.version,
              reconciliationMode: command.reconciliationMode,
              denominations: command.denominations,
            },
            headers: command.idempotencyKey
              ? { "Idempotency-Key": command.idempotencyKey }
              : undefined,
          },
        ),
      ),
    reopenShift: (command) =>
      http.request(`/shifts/${encodeURIComponent(command.shiftId)}/reopen`, {
        method: "POST",
        body: { version: command.version },
        headers: command.idempotencyKey
          ? { "Idempotency-Key": command.idempotencyKey }
          : undefined,
      }),
  });
}
