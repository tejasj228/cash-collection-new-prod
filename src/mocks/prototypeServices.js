import { PROTOTYPE_DATA } from "./prototypeData.js";

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

const eligibilityFor = (command) => {
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
    const request = PROTOTYPE_DATA.requests.find(
      (row) => row.id === command.requestId,
    );
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
  const postedByKey = new Map();
  const terminalPayments = new Map();
  return {
    async loadBootstrap() {
      return withLatency(PROTOTYPE_DATA);
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
      sort,
    } = {}) {
      const term = String(search).trim().toLowerCase();
      let items = PROTOTYPE_DATA.requests.filter(
        (row) =>
          (!term ||
            `${row.patient} ${row.cr} ${row.id}`
              .toLowerCase()
              .includes(term)) &&
          (!chargeType || row.type === chargeType) &&
          (!department || row.department === department),
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
    async getRequest(requestId) {
      const request = PROTOTYPE_DATA.requests.find(
        (row) => row.id === requestId,
      );
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
      return withLatency(eligibilityFor(command));
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
      const eligibility = eligibilityFor(command);
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
      const result = {
        documentNumber: reference(
          command.requestType === "Refund"
            ? "REF"
            : command.requestType === "Estimation"
              ? "EST"
              : "REC",
        ),
        status: "Completed",
        authoritativeTotal: command.displayedTotal,
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
      postedByKey.set(command.idempotencyKey, result);
      return withLatency(result);
    },
    async listTransactions() {
      return withLatency({
        items: PROTOTYPE_DATA.recentTransactions,
        total: PROTOTYPE_DATA.recentTransactions.length,
      });
    },
  };
}
