import { createHttpClient } from "../../../services/httpClient";
import { mapPendingRequest } from "./pendingRequestMapper";
import { mapTransactionRow } from "./transactionRowMapper";
import {
  mapBootstrapWire,
  mapClosedShiftWire,
  mapDashboardWire,
  mapEligibilityWire,
  mapOpenShiftWire,
  mapPaymentOptionsWire,
  mapPatientSearchWire,
  mapPostedTransactionWire,
  mapRequestDetailWire,
  mapShiftClosePreparationWire,
  mapTariffSearchWire,
  mapTerminalPaymentWire,
  toDashboardQuery,
  toEligibilityCommand,
  toPatientSearchQuery,
  toPaymentOptionsQuery,
  toPendingRequestQuery,
  toPendingMetricsQuery,
  toShiftCloseCommand,
  toShiftReopenCommand,
  toTariffQuery,
  toTerminalPaymentCommand,
  toTransactionCommand,
  toTransactionQuery,
} from "./apiWireMappers";
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
      return mapBootstrapWire(data);
    },
    searchPatients: async (query) =>
      mapPatientSearchWire(
        await http.request("/patients", { query: toPatientSearchQuery(query) }),
      ),
    listPendingRequests: async (filters = {}) => {
      const data = await http.request("/requests", {
        query: toPendingRequestQuery(filters),
      });
      return { ...data, items: (data.items || []).map(mapPendingRequest) };
    },
    getPendingRequestMetrics: (filters = {}) =>
      http.request("/dashboard/pending-metrics", {
        query: toPendingMetricsQuery(filters),
      }),
    getDashboard: async (filters = {}) =>
      mapDashboardWire(
        await http.request("/dashboard", { query: toDashboardQuery(filters) }),
      ),
    getRequest: async (requestId) =>
      mapRequestDetailWire(
        await http.request(`/requests/${encodeURIComponent(requestId)}`),
      ),
    getTariffs: async (filters = {}) =>
      mapTariffSearchWire(
        await http.request("/tariffs", { query: toTariffQuery(filters) }),
      ),
    getPaymentOptions: async (context = {}) =>
      mapPaymentOptionsWire(
        await http.request("/payment-options", {
          query: toPaymentOptionsQuery(context),
        }),
      ),
    checkEligibility: async (context) =>
      mapEligibilityWire(
        await http.request("/eligibility", {
          method: "POST",
          body: toEligibilityCommand(context),
        }),
      ),
    initiateTerminalPayment: async (command) =>
      mapTerminalPaymentWire(
        await http.request("/terminal-payments", {
          method: "POST",
          body: toTerminalPaymentCommand(command),
        }),
      ),
    getTerminalPaymentStatus: async ({ terminalTransactionId }) =>
      mapTerminalPaymentWire(
        await http.request(
          `/terminal-payments/${encodeURIComponent(terminalTransactionId)}`,
        ),
      ),
    postTransaction: async (command) =>
      mapPostedTransactionWire(
        await http.request("/transactions", {
          method: "POST",
          body: toTransactionCommand(command),
          headers: command.idempotencyKey
            ? { "Idempotency-Key": command.idempotencyKey }
            : undefined,
        }),
      ),
    listTransactions: async (filters = {}) => {
      const data = await http.request("/transactions", {
        query: toTransactionQuery(filters),
      });
      return { ...data, items: (data.items || []).map(mapTransactionRow) };
    },
    prepareShiftClose: async () =>
      normalizeShiftClosePreparation(
        mapShiftClosePreparationWire(
          await http.request("/shifts/current/close-preparation"),
        ),
      ),
    closeShift: async (command) =>
      normalizeClosedShift(
        mapClosedShiftWire(
          await http.request(
            `/shifts/${encodeURIComponent(command.shiftId)}/close`,
            {
              method: "POST",
              body: toShiftCloseCommand(command),
              headers: command.idempotencyKey
                ? { "Idempotency-Key": command.idempotencyKey }
                : undefined,
            },
          ),
        ),
      ),
    reopenShift: (command) =>
      http
        .request(`/shifts/${encodeURIComponent(command.shiftId)}/reopen`, {
          method: "POST",
          body: toShiftReopenCommand(command),
          headers: command.idempotencyKey
            ? { "Idempotency-Key": command.idempotencyKey }
            : undefined,
        })
        .then(mapOpenShiftWire),
  });
}
