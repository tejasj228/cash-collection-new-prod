import { PROTOTYPE_DATA } from "./prototypeData";
import { createPrototypeServices } from "./prototypeServices";
import { computeShiftSummary } from "../features/cashCollection/model/shiftSummary";

const resolveAfterPrototypeLatency = async (promise) => {
  jest.advanceTimersByTime(1000);
  return promise;
};

test("posting a pending request resolves it and adds it to the dashboard data", async () => {
  jest.useFakeTimers();
  const services = createPrototypeServices({
    now: () => new Date("2024-09-03T11:45:00").getTime(),
  });
  const request = PROTOTYPE_DATA.requests[0];
  const patient = PROTOTYPE_DATA.patients.find((row) => row.cr === request.cr);
  const service = PROTOTYPE_DATA.serviceOptions.find((row) => row.id === "ipd");
  const workflow = PROTOTYPE_DATA.billingByService.ipd.Receipt[0];

  const result = await resolveAfterPrototypeLatency(
    services.postTransaction({
      source: "request",
      requestId: request.id,
      requestVersion: request.version,
      requestType: "Receipt",
      billingServiceId: workflow.id,
      billingServiceName: workflow.label,
      processingBillingServiceId: workflow.processingServiceId,
      workflowId: workflow.uiFamily,
      hospitalServiceId: service.id,
      patientId: patient.id,
      crNumber: patient.cr,
      lines: [{ rate: "100.00", qty: "1", discount: "0" }],
      displayedTotal: "100.00",
      payment: { mode: "Cash", summary: "Cash" },
      idempotencyKey: "prototype-resolution-test",
    }),
  );

  const bootstrap = await resolveAfterPrototypeLatency(
    services.loadBootstrap(),
  );

  expect(bootstrap.requests.some((row) => row.id === request.id)).toBe(false);
  expect(bootstrap.queueSummary.pendingCount).toBe(
    PROTOTYPE_DATA.requests.length - 1,
  );
  expect(bootstrap.recentTransactions[0]).toEqual(
    expect.objectContaining({
      no: result.documentNumber,
      patient: patient.name,
      amount: "100.00",
      status: "Completed",
      requestType: request.type,
    }),
  );

  jest.useRealTimers();
});

test("posting a direct collection adds it to the dashboard without consuming a request", async () => {
  jest.useFakeTimers();
  const services = createPrototypeServices({
    now: () => new Date("2024-09-03T12:15:00").getTime(),
  });
  const patient = PROTOTYPE_DATA.patients[1];
  const service = PROTOTYPE_DATA.serviceOptions.find(
    (row) => row.id === "opd-normal",
  );
  const workflow = PROTOTYPE_DATA.billingByService[service.id].Receipt[0];

  const result = await resolveAfterPrototypeLatency(
    services.postTransaction({
      source: "direct",
      requestId: null,
      requestType: "Receipt",
      billingServiceId: workflow.id,
      billingServiceName: workflow.label,
      processingBillingServiceId: workflow.processingServiceId,
      workflowId: workflow.uiFamily,
      hospitalServiceId: service.id,
      patientId: patient.id,
      crNumber: patient.cr,
      lines: [{ rate: "250.00", qty: "1", discount: "0" }],
      displayedTotal: "250.00",
      payment: { mode: "UPI", summary: "UPI" },
      idempotencyKey: "prototype-direct-test",
    }),
  );

  const bootstrap = await resolveAfterPrototypeLatency(
    services.loadBootstrap(),
  );

  expect(result.resolvedRequestId).toBeNull();
  expect(bootstrap.requests).toHaveLength(PROTOTYPE_DATA.requests.length);
  expect(bootstrap.recentTransactions[0]).toEqual(
    expect.objectContaining({
      no: result.documentNumber,
      patient: patient.name,
      mode: "UPI",
      amount: "250.00",
      status: "Completed",
    }),
  );

  jest.useRealTimers();
});

test("dashboard and end shift use the same unfiltered cash-only net", async () => {
  jest.useFakeTimers();
  const services = createPrototypeServices();
  const expectedCashInDrawer = computeShiftSummary(
    PROTOTYPE_DATA.recentTransactions.filter(
      (row) => row.dateIso === PROTOTYPE_DATA.todayIso && row.mode === "Cash",
    ),
  ).cashInDrawer;

  const dashboard = await resolveAfterPrototypeLatency(
    services.getDashboard({ paymentMode: "UPI" }),
  );
  const closePreparation = await resolveAfterPrototypeLatency(
    services.prepareShiftClose(),
  );

  expect(Number(dashboard.kpis.cashInDrawer)).toBe(expectedCashInDrawer);
  expect(Number(closePreparation.expectedCash)).toBe(expectedCashInDrawer);

  jest.useRealTimers();
});
