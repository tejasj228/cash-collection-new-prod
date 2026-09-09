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
});
