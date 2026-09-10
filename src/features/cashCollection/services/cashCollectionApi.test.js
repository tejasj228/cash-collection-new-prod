import { createCashCollectionApi } from "./cashCollectionApi";

describe("cash collection API adapter", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        requestId: "req-1",
        data: { items: [], total: 0 },
      }),
    });
  });

  afterEach(() => jest.restoreAllMocks());

  test("sends request filters as query parameters", async () => {
    const api = createCashCollectionApi({
      apiBaseUrl: "/api/cash-collection",
      credentials: "include",
      requestTimeoutMs: 1000,
    });
    await api.listPendingRequests({ page: 3, size: 10, search: "939112" });
    const [url, options] = global.fetch.mock.calls[0];
    expect(url.toString()).toContain(
      "/api/cash-collection/requests?page=3&size=10&search=939112",
    );
    expect(options.credentials).toBe("include");
  });

  test("uses the terminal transaction identifier in the polling path", async () => {
    const api = createCashCollectionApi({
      apiBaseUrl: "/api/cash-collection",
      credentials: "include",
      requestTimeoutMs: 1000,
    });
    await api.getTerminalPaymentStatus({ terminalTransactionId: "POS-42" });
    const [url] = global.fetch.mock.calls[0];
    expect(url.toString()).toContain("/terminal-payments/POS-42");
  });

  test("requests pending metrics with only pending-relevant filters", async () => {
    const api = createCashCollectionApi({
      apiBaseUrl: "/api/cash-collection",
      requestTimeoutMs: 1000,
    });
    await api.getPendingRequestMetrics({
      date: "2026-09-10",
      category: "General",
      department: "Cardiology",
      chargeType: "OPD Service",
    });
    const [url] = global.fetch.mock.calls[0];
    expect(url.toString()).toContain("/dashboard/pending-metrics?");
    expect(url.searchParams.get("date")).toBe("2026-09-10");
    expect(url.searchParams.get("category")).toBe("General");
    expect(url.searchParams.get("department")).toBe("Cardiology");
    expect(url.searchParams.get("chargeType")).toBe("OPD Service");
    expect(url.searchParams.has("mode")).toBe(false);
  });

  test("requests the server-authoritative dashboard with linked filters", async () => {
    const api = createCashCollectionApi({
      apiBaseUrl: "/api/cash-collection",
      requestTimeoutMs: 1000,
    });
    await api.getDashboard({
      date: "2026-09-10",
      category: "General",
      group: "Cardiology",
      requestType: "OPD Service",
    });
    const [url] = global.fetch.mock.calls[0];
    expect(url.pathname).toContain("/dashboard");
    expect(url.searchParams.get("date")).toBe("2026-09-10");
    expect(url.searchParams.get("group")).toBe("Cardiology");
  });

  test.each(["listPendingRequests", "loadBootstrap"])(
    "%s maps pending-table API names without changing workflow fields",
    async (method) => {
      const row = {
        req_id: "REQ-100001",
        req_date: "09/09/2026",
        pat_name: "Example Patient",
        department_name: "General Medicine",
        cr_num: "093911260000001",
        charge_type: "OPD Refund",
        amount: 480,
        version: 2,
      };
      const listKey = method === "loadBootstrap" ? "requests" : "items";
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { [listKey]: [row], total: 25, page: 0, size: 10 },
        }),
      });
      const api = createCashCollectionApi({
        apiBaseUrl: "/api/cash-collection",
        requestTimeoutMs: 1000,
      });
      const result = await api[method]();
      expect(result[listKey][0]).toMatchObject({
        id: row.req_id,
        date: row.req_date,
        dateIso: "2026-09-09",
        patient: row.pat_name,
        department: row.department_name,
        cr: row.cr_num,
        type: row.charge_type,
        amount: "480",
        version: "2",
      });
      expect(
        Object.values(result[listKey][0]).every(
          (value) => typeof value === "string",
        ),
      ).toBe(true);
      expect(result.total).toBe(25);
    },
  );

  test.each(["listTransactions", "loadBootstrap"])(
    "%s keeps every transaction-table row value as display text",
    async (method) => {
      const row = {
        no: 88241,
        patient: "Example Patient",
        cr: 939112600000001,
        dateIso: "2026-09-09",
        time: "10:38 AM",
        mode: "Cash",
        amount: 4280,
        status: "Completed",
        charge_type: "OPD Service",
      };
      const listKey =
        method === "loadBootstrap" ? "recentTransactions" : "items";
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { [listKey]: [row], total: 25, page: 0, size: 10 },
        }),
      });
      const api = createCashCollectionApi({
        apiBaseUrl: "/api/cash-collection",
        requestTimeoutMs: 1000,
      });
      const result = await api[method]();

      expect(result[listKey][0]).toEqual({
        no: "88241",
        patient: "Example Patient",
        cr: "939112600000001",
        dateIso: "2026-09-09",
        time: "10:38 AM",
        mode: "Cash",
        amount: "4280",
        status: "Completed",
        charge_type: "OPD Service",
        requestType: "OPD Service",
      });
      expect(
        Object.values(result[listKey][0]).every(
          (value) => typeof value === "string",
        ),
      ).toBe(true);
      expect(result.total).toBe(25);
    },
  );

  test("forwards the idempotency key when posting", async () => {
    const api = createCashCollectionApi({
      apiBaseUrl: "/api/cash-collection",
      credentials: "include",
      requestTimeoutMs: 1000,
    });
    await api.postTransaction({
      idempotencyKey: "fixed-key",
      patientId: "p-1",
    });
    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers["Idempotency-Key"]).toBe("fixed-key");
  });

  test("closes a shift with only its version and denomination quantities", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        requestId: "req-close",
        data: {
          shiftId: "shift/a",
          status: "CLOSED",
          businessDate: "2026-09-10",
          closedAt: "2026-09-10T17:30:00+05:30",
          expectedCash: "1000.00",
          countedCash: "1000.00",
          cumulativeCash: "1000.00",
          reconciliationMode: "DENOMINATION",
          version: "closed-v1",
          summaryNumber: "SUMM-1",
        },
      }),
    });
    const api = createCashCollectionApi({
      apiBaseUrl: "/api/cash-collection",
      requestTimeoutMs: 1000,
    });
    await api.closeShift({
      shiftId: "shift/a",
      version: "opaque-v2",
      reconciliationMode: "DENOMINATION",
      idempotencyKey: "shift-close-fixed-key",
      denominations: [{ code: "NOTE_500", quantity: 2 }],
      expectedCash: "1000.00",
    });
    const [url, options] = global.fetch.mock.calls[0];
    expect(url.pathname).toContain("/shifts/shift%2Fa/close");
    expect(options.headers["Idempotency-Key"]).toBe("shift-close-fixed-key");
    expect(JSON.parse(options.body)).toEqual({
      version: "opaque-v2",
      reconciliationMode: "DENOMINATION",
      denominations: [{ code: "NOTE_500", quantity: 2 }],
    });
  });

  test("reopens a same-day shift with idempotency and concurrency headers", async () => {
    const api = createCashCollectionApi({
      apiBaseUrl: "/api/cash-collection",
      requestTimeoutMs: 1000,
    });
    await api.reopenShift({
      shiftId: "closed-1",
      version: "closed-v1",
      idempotencyKey: "reopen-fixed-key-123",
    });
    const [url, options] = global.fetch.mock.calls[0];
    expect(url.pathname).toContain("/shifts/closed-1/reopen");
    expect(options.headers["Idempotency-Key"]).toBe("reopen-fixed-key-123");
    expect(JSON.parse(options.body)).toEqual({ version: "closed-v1" });
  });
});
