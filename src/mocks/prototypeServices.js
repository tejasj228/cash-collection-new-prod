import { PROTOTYPE_DATA } from "./prototypeData.js";
import {
  computeShiftSummary,
  hourOf,
  parseAmount,
} from "../features/cashCollection/model/shiftSummary.js";

let sequence = 88500;
const reference = (prefix) =>
  `${prefix}-2024-${String(sequence++).padStart(6, "0")}`;

const workflowFor = (command) => {
  const options =
    PROTOTYPE_DATA.billingByService[command.hospitalServiceId]?.[
      command.requestType
    ] || [];
  return options.find(
    (option) => String(option.id) === String(command.billingServiceId),
  );
};

const eligibilityFor = (command, pendingRequests = PROTOTYPE_DATA.requests) => {
  const patient = PROTOTYPE_DATA.patients.find(
    (row) => row.id === command.patientId,
  );
  const workflow = workflowFor(command);
  if (!patient)
    return {
      eligible: false,
      code: "PATIENT_NOT_FOUND",
      message: "The selected patient could not be loaded.",
    };
  if (!workflow)
    return {
      eligible: false,
      code: "WORKFLOW_NOT_ALLOWED",
      message:
        "The selected hospital service, request type and billing service combination is not available.",
    };
  if (workflow.legacyMode === "SERVER_RESOLVED")
    return {
      eligible: false,
      code: "WORKFLOW_NOT_IMPLEMENTED",
      message:
        "The deployed legacy write route for this transaction has not been verified.",
    };
  if (command.source === "request") {
    const request = pendingRequests.find((row) => row.id === command.requestId);
    if (!request)
      return {
        eligible: false,
        code: "REQUEST_ALREADY_PROCESSED",
        message: "This request is no longer available in the collection queue.",
      };
    if (
      request.cr !== command.crNumber ||
      isRefundRequestType(request.type) !== (command.requestType === "Refund")
    ) {
      return {
        eligible: false,
        code: "REQUEST_CHANGED",
        message: "The request details changed. Reload the collection queue.",
      };
    }
  }
  const service = PROTOTYPE_DATA.serviceOptions.find(
    (row) => row.id === command.hospitalServiceId,
  );
  if (command.source !== "request") {
    if (
      !patient.eligibleChargeTypeIds?.includes(
        String(service?.legacyChargeTypeId),
      )
    ) {
      return {
        eligible: false,
        code: "HOSPITAL_SERVICE_MISMATCH",
        message: `This patient has no eligible ${service?.label || "hospital service"} episode.`,
      };
    }
    if (command.hospitalServiceId === "ipd" && patient.status !== "Admitted") {
      return {
        eligible: false,
        code: "PATIENT_NOT_ADMITTED",
        message:
          "The patient must have a current admitted IPD episode for this transaction.",
      };
    }
    if (
      workflow.uiFamily === "account-payment" &&
      String(workflow.id) === "19" &&
      patient.accountOpen
    ) {
      return {
        eligible: false,
        code: "ACCOUNT_ALREADY_OPEN",
        message:
          "Account already opened or advance collected. Multiple accounts cannot be opened.",
      };
    }
    if (
      (workflow.uiFamily.startsWith("bill-settlement") ||
        String(workflow.id) === "20") &&
      !patient.accountOpen
    ) {
      return {
        eligible: false,
        code: "ACCOUNT_NOT_OPEN",
        message: "An active patient account is required for this transaction.",
      };
    }
    if (command.requestType === "Refund" && !patient.refundableDocumentCount) {
      return {
        eligible: false,
        code: "NO_REFUNDABLE_BILL",
        message:
          "No eligible receipt or refundable tariff is available for this patient.",
      };
    }
  }
  return {
    eligible: true,
    code: "ELIGIBLE",
    workflow,
    patientContextVersion: `patient-${patient.id}-v1`,
    workflowContext: patient.workflowContext || {},
  };
};

const isRefundRequestType = (value) =>
  String(value || "")
    .toLowerCase()
    .includes("refund");

/**
 * Prototype-only latency. The real services respond over the network; the
 * in-memory prototype resolves instantly, which hides every loading state.
 * A fixed ~1s pause on read/write calls lets the UI's loaders, skeletons and
 * transitions actually be seen during a design review.
 */
const PROTOTYPE_LATENCY_MS = 1000;
const withLatency = (value, ms = PROTOTYPE_LATENCY_MS) =>
  new Promise((resolve) => {
    window.setTimeout(() => resolve(value), ms);
  });

/** Browser-only adapters used by the standalone design review build. */
export function createPrototypeServices({ now = () => Date.now() } = {}) {
  let pendingRequests = [...PROTOTYPE_DATA.requests];
  let transactions = [...PROTOTYPE_DATA.recentTransactions];
  const postedByKey = new Map();
  const closedShiftsByKey = new Map();
  const reopenedShiftsByKey = new Map();
  const terminalPayments = new Map();
  let shiftVersion = "prototype-shift-v1";
  let shiftClosed = false;
  let segmentNumber = 1;
  let submittedCash = 0;
  let currentSegmentCash = computeShiftSummary(
    transactions.filter(
      (row) => row.dateIso === PROTOTYPE_DATA.todayIso && row.mode === "Cash",
    ),
  ).cashInDrawer;
  return {
    async loadBootstrap() {
      return withLatency({
        ...PROTOTYPE_DATA,
        requests: pendingRequests,
        recentTransactions: transactions,
        queueSummary: {
          ...PROTOTYPE_DATA.queueSummary,
          pendingCount: pendingRequests.length,
          todayPendingCount: pendingRequests.filter(
            (row) => row.dateIso === PROTOTYPE_DATA.todayIso,
          ).length,
        },
      });
    },
    async searchPatients(query) {
      const term = String(query || "").toLowerCase();
      return withLatency(
        PROTOTYPE_DATA.patients.filter((row) =>
          `${row.name} ${row.cr} ${row.mobile}`.toLowerCase().includes(term),
        ),
      );
    },
    async listPendingRequests({
      page = 0,
      size = 10,
      search = "",
      chargeType,
      department,
      category,
      date,
      sort,
    } = {}) {
      const term = String(search).trim().toLowerCase();
      let items = pendingRequests.filter(
        (row) =>
          (!term ||
            `${row.patient} ${row.cr} ${row.id}`
              .toLowerCase()
              .includes(term)) &&
          (!chargeType || row.type === chargeType) &&
          (!department || row.department === department) &&
          (!category || row.category === category) &&
          (!date || row.dateIso === date),
      );
      if (sort) {
        const [field, direction] = String(sort).split(",");
        const value =
          field === "amount"
            ? (row) => Number(String(row.amount).replace(/,/g, ""))
            : (row) => row.dateIso;
        items = [...items].sort(
          (left, right) =>
            (value(left) > value(right)
              ? 1
              : value(left) < value(right)
                ? -1
                : 0) * (direction === "desc" ? -1 : 1),
        );
      }
      const start = Number(page) * Number(size);
      return withLatency({
        items: items.slice(start, start + Number(size)),
        total: items.length,
        page: Number(page),
        size: Number(size),
      });
    },
    async getPendingRequestMetrics({
      date,
      category,
      department,
      chargeType,
    } = {}) {
      const rows = pendingRequests.filter(
        (row) =>
          (!date || row.dateIso === date) &&
          (!category || row.category === category) &&
          (!department || row.department === department) &&
          (!chargeType || row.type === chargeType),
      );
      const counts = rows.reduce((map, row) => {
        map.set(row.type, (map.get(row.type) || 0) + 1);
        return map;
      }, new Map());
      return withLatency({
        total: rows.length,
        byChargeType: [...counts]
          .map(([value, count]) => ({ chargeType: value, count }))
          .sort((left, right) => right.count - left.count),
      });
    },
    async getDashboard(filters = {}) {
      const date = filters.date || PROTOTYPE_DATA.todayIso;
      const dateTransactions = transactions.filter(
        (row) => row.dateIso === date,
      );
      const filteredTransactions = dateTransactions.filter(
        (row) =>
          (!filters.paymentMode || row.mode === filters.paymentMode) &&
          (!filters.status || row.status === filters.status) &&
          (filters.hour == null || hourOf(row.time) === Number(filters.hour)) &&
          (!filters.category || row.category === filters.category) &&
          (!filters.group || row.department === filters.group) &&
          (!filters.requestType || row.requestType === filters.requestType),
      );
      const summary = computeShiftSummary(filteredTransactions);
      const cashInDrawer = computeShiftSummary(
        dateTransactions.filter((row) => row.mode === "Cash"),
      ).cashInDrawer;
      const completed = filteredTransactions.filter(
        (row) => row.status === "Completed",
      );
      const bucket = (key) => {
        const grouped = completed.reduce((map, row) => {
          const id = String(row[key] || "—");
          const current = map.get(id) || { id, label: id, amount: 0, count: 0 };
          current.amount += parseAmount(row.amount);
          current.count += 1;
          map.set(id, current);
          return map;
        }, new Map());
        return [...grouped.values()].map((row) => ({
          ...row,
          amount: row.amount.toFixed(2),
          count: String(row.count),
          percentage: summary.collectedTotal
            ? ((Number(row.amount) / summary.collectedTotal) * 100).toFixed(2)
            : "0.00",
        }));
      };
      const hourlyCollections = Array.from({ length: 24 }, (_, hour) => {
        const rows = completed.filter((row) => hourOf(row.time) === hour);
        const amount = rows.reduce(
          (sum, row) => sum + parseAmount(row.amount),
          0,
        );
        return {
          id: String(hour),
          label: String(hour),
          hour,
          amount: amount.toFixed(2),
          count: String(rows.length),
          percentage: summary.collectedTotal
            ? ((amount / summary.collectedTotal) * 100).toFixed(2)
            : "0.00",
        };
      });
      return withLatency({
        businessDate: date,
        version: shiftVersion,
        generatedAt: new Date(now()).toISOString(),
        kpis: {
          totalCollected: summary.collectedTotal.toFixed(2),
          refunds: summary.refundTotal.toFixed(2),
          netCollection: summary.net.toFixed(2),
          bills: String(summary.collectionCount),
          cashInDrawer: cashInDrawer.toFixed(2),
          largestCollection: summary.largest.toFixed(2),
        },
        breakdowns: {
          paymentModes: bucket("mode"),
          categories: bucket("category"),
          groups: bucket("department"),
          requestTypes: bucket("requestType"),
        },
        hourlyCollections,
        recentTransactions: {
          items: filteredTransactions.slice(0, 5),
          total: filteredTransactions.length,
          page: 0,
          size: 5,
        },
      });
    },
    async getRequest(requestId) {
      const request = pendingRequests.find((row) => row.id === requestId);
      if (!request) return withLatency(null);
      return withLatency({
        ...request,
        linkedPatient:
          PROTOTYPE_DATA.patients.find((row) => row.cr === request.cr) || null,
      });
    },
    async getTariffs() {
      return withLatency(PROTOTYPE_DATA.tariffCatalog);
    },
    async getPaymentOptions() {
      return withLatency(PROTOTYPE_DATA.paymentOptions);
    },
    async checkEligibility(command) {
      return withLatency(eligibilityFor(command, pendingRequests));
    },
    async initiateTerminalPayment(command) {
      if (
        !command.terminalId ||
        !["Card", "UPI"].includes(command.paymentMode) ||
        Number(command.amount) <= 0
      )
        throw new Error(
          "A valid terminal, payment mode and amount are required.",
        );
      const terminalTransactionId = reference("POS");
      terminalPayments.set(terminalTransactionId, {
        startedAt: now(),
        approvalCode: reference("APP").slice(-10),
        cardLastFour:
          command.paymentMode === "Card"
            ? String(1000 + Math.floor(Math.random() * 8999))
            : null,
        terminalId: command.terminalId,
        providerTransactionId: terminalTransactionId,
      });
      return {
        terminalTransactionId,
        status: "PENDING",
        pollAfterMs: 10000,
        expiresInSeconds: 300,
        prototypeAutoApproveAfterMs: 5000,
      };
    },
    async getTerminalPaymentStatus({ terminalTransactionId }) {
      const payment = terminalPayments.get(terminalTransactionId);
      if (!payment)
        throw new Error("The terminal transaction could not be found.");
      if (now() - payment.startedAt < 5000)
        return { terminalTransactionId, status: "PENDING" };
      return { terminalTransactionId, status: "APPROVED", ...payment };
    },
    async postTransaction(command) {
      if (postedByKey.has(command.idempotencyKey))
        return withLatency(postedByKey.get(command.idempotencyKey));
      const eligibility = eligibilityFor(command, pendingRequests);
      if (!eligibility.eligible) {
        const error = new Error(eligibility.message);
        error.code = eligibility.code;
        throw error;
      }
      if (
        String(command.processingBillingServiceId) !==
          String(eligibility.workflow.processingServiceId) ||
        command.workflowId !== eligibility.workflow.uiFamily
      ) {
        const error = new Error(
          "The billing workflow changed. Reload the transaction before posting.",
        );
        error.code = "WORKFLOW_MISMATCH";
        throw error;
      }
      const gross = command.lines.reduce(
        (sum, line) => sum + Number(line.rate) * Number(line.qty || 0),
        0,
      );
      const discount = command.lines.reduce((sum, line) => {
        const gross = Number(line.rate) * Number(line.qty || 0);
        const percentage = Math.min(
          100,
          Math.max(0, Number(line.discount || 0)),
        );
        return sum + (gross * percentage) / 100;
      }, 0);
      const patient =
        PROTOTYPE_DATA.patients.find((row) => row.id === command.patientId) ||
        null;
      const pendingRequest = pendingRequests.find(
        (row) => row.id === command.requestId,
      );
      const documentNumber = reference(
        command.requestType === "Refund"
          ? "REF"
          : command.requestType === "Estimation"
            ? "EST"
            : "REC",
      );
      const dashboardTransaction =
        command.requestType === "Estimation"
          ? null
          : {
              no: documentNumber,
              patient: patient?.name || "Walk-in patient",
              dateIso: PROTOTYPE_DATA.todayIso,
              cr: patient?.cr || command.crNumber || "—",
              mode: command.payment?.mode || "Cash",
              amount: Number(command.displayedTotal || 0).toFixed(2),
              time: new Date(now()).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              status:
                command.requestType === "Refund" ? "Refunded" : "Completed",
              requestType:
                pendingRequest?.type ||
                command.billingServiceName ||
                command.requestType,
              department:
                pendingRequest?.department ||
                patient?.department ||
                "General Medicine",
              category:
                pendingRequest?.category || patient?.category || "General",
            };
      const result = {
        documentNumber,
        status: "Completed",
        authoritativeTotal: command.displayedTotal,
        resolvedRequestId: pendingRequest?.id || null,
        dashboardTransaction,
        printableData: {
          documentType: command.requestType,
          documentDate: PROTOTYPE_DATA.todayIso.split("-").reverse().join("/"),
          patient,
          lines: command.lines,
          payment: command.payment,
          totals: {
            gross: gross.toFixed(2),
            discount: discount.toFixed(2),
            net: command.displayedTotal,
          },
        },
      };
      if (pendingRequest)
        pendingRequests = pendingRequests.filter(
          (row) => row.id !== pendingRequest.id,
        );
      if (dashboardTransaction)
        transactions = [dashboardTransaction, ...transactions];
      postedByKey.set(command.idempotencyKey, result);
      if (
        command.payment?.mode === "Cash" &&
        command.requestType !== "Estimation"
      )
        currentSegmentCash +=
          (command.requestType === "Refund" ? -1 : 1) *
          Number(command.displayedTotal || 0);
      return withLatency(result);
    },
    async listTransactions() {
      return withLatency({
        items: transactions,
        total: transactions.length,
      });
    },
    async prepareShiftClose() {
      if (shiftClosed) {
        const error = new Error("This counter shift is already closed.");
        error.code = "SHIFT_ALREADY_CLOSED";
        throw error;
      }
      const expectedCash = currentSegmentCash;
      return withLatency({
        shiftId: `prototype-shift-segment-${segmentNumber}`,
        version: shiftVersion,
        businessDate: PROTOTYPE_DATA.todayIso,
        status: "OPEN",
        canClose: true,
        blockers: [],
        expectedCash: expectedCash.toFixed(2),
        previousSubmittedCash: submittedCash.toFixed(2),
        cumulativeExpectedCash: (submittedCash + expectedCash).toFixed(2),
        segmentNumber: String(segmentNumber),
        denominations: [
          ...[500, 200, 100, 50, 20, 10].map((value) => ({
            code: `NOTE_${value}`,
            kind: "NOTE",
            value: String(value),
            label: `₹${value}`,
          })),
          ...[20, 10, 5, 2, 1].map((value) => ({
            code: `COIN_${value}`,
            kind: "COIN",
            value: String(value),
            label: `₹${value}`,
          })),
        ],
      });
    },
    async closeShift(command) {
      if (closedShiftsByKey.has(command.idempotencyKey))
        return withLatency(closedShiftsByKey.get(command.idempotencyKey));
      if (shiftClosed) {
        const error = new Error("This counter shift is already closed.");
        error.code = "SHIFT_ALREADY_CLOSED";
        throw error;
      }
      if (command.version !== shiftVersion) {
        const error = new Error(
          "The shift totals changed. Reopen End shift and count again.",
        );
        error.code = "SHIFT_CHANGED";
        throw error;
      }
      const prepared = await this.prepareShiftClose();
      const denominationValues = new Map(
        prepared.denominations.map((item) => [item.code, Number(item.value)]),
      );
      const countedMagnitude = command.denominations.reduce(
        (sum, item) =>
          sum +
          Number(denominationValues.get(item.code) || 0) *
            Number(item.quantity || 0),
        0,
      );
      const countedCash =
        Number(prepared.expectedCash) < 0
          ? -countedMagnitude
          : countedMagnitude;
      if (
        command.reconciliationMode !== "SKIPPED" &&
        Math.abs(countedCash - Number(prepared.expectedCash)) >= 0.005
      ) {
        const error = new Error(
          "The denomination total does not match the server cash total.",
        );
        error.code = "CASH_MISMATCH";
        throw error;
      }
      shiftClosed = true;
      shiftVersion = `prototype-shift-closed-v${segmentNumber}`;
      submittedCash += Number(prepared.expectedCash);
      const result = {
        shiftId: command.shiftId,
        status: "CLOSED",
        closedAt: new Date(now()).toISOString(),
        businessDate: PROTOTYPE_DATA.todayIso,
        expectedCash: prepared.expectedCash,
        countedCash:
          command.reconciliationMode === "SKIPPED"
            ? null
            : countedCash.toFixed(2),
        reconciliationMode: command.reconciliationMode,
        cumulativeCash: submittedCash.toFixed(2),
        previousSubmittedCash: prepared.previousSubmittedCash,
        version: shiftVersion,
        segmentNumber: String(segmentNumber),
        summaryNumber: `PROTOTYPE-SUMM-${segmentNumber}`,
      };
      closedShiftsByKey.set(command.idempotencyKey, result);
      return withLatency(result);
    },
    async reopenShift(command) {
      if (reopenedShiftsByKey.has(command.idempotencyKey))
        return withLatency(reopenedShiftsByKey.get(command.idempotencyKey));
      if (!shiftClosed) {
        const error = new Error("This counter already has an open shift.");
        error.code = "SHIFT_ALREADY_OPEN";
        throw error;
      }
      if (command.version !== shiftVersion) {
        const error = new Error(
          "The closed shift changed. Reload and try again.",
        );
        error.code = "SHIFT_CHANGED";
        throw error;
      }
      segmentNumber += 1;
      currentSegmentCash = 0;
      shiftClosed = false;
      shiftVersion = `prototype-shift-v${segmentNumber}`;
      const result = {
        shiftId: `prototype-shift-segment-${segmentNumber}`,
        version: shiftVersion,
        businessDate: PROTOTYPE_DATA.todayIso,
        status: "OPEN",
        segmentNumber: String(segmentNumber),
        previousSubmittedCash: submittedCash.toFixed(2),
      };
      reopenedShiftsByKey.set(command.idempotencyKey, result);
      return withLatency(result);
    },
  };
}
