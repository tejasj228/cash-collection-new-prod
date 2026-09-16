import { createCashCollectionApi } from "./cashCollectionApi";

const bootstrapWire = (overrides = {}) => ({
  business_date: "2026-09-10",
  facility_details: {
    facility_name: "Example Hospital",
    facility_subtitle: "Billing",
  },
  hospital_services: [],
  billing_services_by_hospital_service: {},
  payment_options: {
    payment_modes: [],
    payment_card_types: [],
    payment_pos_terminals: [],
  },
  pending_queue_summary: {
    pending_request_count: "0",
    today_pending_request_count: "0",
    cash_in_drawer_amount: "0.00",
  },
  request_filter_options: {
    hospital_service_names: [],
    req_types: [],
    department_names: [],
  },
  patient_seed_list: [],
  pending_request_queue: [],
  tariff_group_names: [],
  tariff_catalog: [],
  collection_mode_options: [],
  recent_transaction_rows: [],
  recent_estimate_rows: [],
  ...overrides,
});

describe("cash collection API adapter", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        trace_id: "trace-1",
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
    expect(url.pathname).toContain("/api/cash-collection/requests");
    expect(url.searchParams.get("page")).toBe("3");
    expect(url.searchParams.get("size")).toBe("10");
    expect(url.searchParams.get("req_search")).toBe("939112");
    expect(options.credentials).toBe("include");
  });

  test("sends the admitted IPD patient search and recent-result limit", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });
    const api = createCashCollectionApi({
      apiBaseUrl: "/api/cash-collection",
      credentials: "include",
      requestTimeoutMs: 1000,
    });

    await api.searchPatients({
      query: "Rajesh, 41207",
      hospitalServiceId: "ipd",
      admittedOnly: true,
      page: 0,
      size: 10,
      sort: "admittedOn,desc",
    });

    const [url] = global.fetch.mock.calls[0];
    expect(url.pathname).toContain("/patients");
    expect(url.searchParams.get("pat_search")).toBe("Rajesh, 41207");
    expect(url.searchParams.get("hospital_service_id")).toBe("ipd");
    expect(url.searchParams.get("admitted_only")).toBe("true");
    expect(url.searchParams.get("page")).toBe("0");
    expect(url.searchParams.get("size")).toBe("10");
    expect(url.searchParams.get("admission_sort")).toBe("admitted_on,desc");
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
      hospitalService: "OPD",
      requestType: "Service",
    });
    const [url] = global.fetch.mock.calls[0];
    expect(url.toString()).toContain("/dashboard/pending-metrics?");
    expect(url.searchParams.get("pending_date")).toBe("2026-09-10");
    expect(url.searchParams.get("category_name")).toBe("General");
    expect(url.searchParams.get("department_name")).toBe("Cardiology");
    expect(url.searchParams.get("hospital_service_name")).toBe("OPD");
    expect(url.searchParams.get("req_type")).toBe("Service");
    expect(url.searchParams.has("payment_mode")).toBe(false);
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
      requestType: "Service",
    });
    const [url] = global.fetch.mock.calls[0];
    expect(url.pathname).toContain("/dashboard");
    expect(url.searchParams.get("dashboard_date")).toBe("2026-09-10");
    expect(url.searchParams.get("department_name")).toBe("Cardiology");
    expect(url.searchParams.get("req_type")).toBe("Service");
  });

  test("maps prefixed pending-request fields without changing the UI workflow", async () => {
    const row = {
      req_id: "REQ-100001",
      req_date: "09/09/2026",
      pat_name: "Example Patient",
      department_name: "General Medicine",
      category_name: "General",
      cr_num: "093911260000001",
      hospital_service_name: "OPD",
      req_type: "Refund",
      req_amount: 480,
      req_version: 2,
    };
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { items: [row], total: 25, page: 0, size: 10 },
      }),
    });
    const api = createCashCollectionApi({
      apiBaseUrl: "/api/cash-collection",
      requestTimeoutMs: 1000,
    });
    const result = await api.listPendingRequests();
    expect(result.items[0]).toMatchObject({
      id: row.req_id,
      date: row.req_date,
      dateIso: "2026-09-09",
      patient: row.pat_name,
      department: row.department_name,
      cr: row.cr_num,
      hospitalService: "OPD",
      requestType: "Refund",
      amount: "480",
      version: "2",
    });
    expect(result.items[0].type).toBeUndefined();
    expect(result.items[0].req_amount).toBe("480");
    expect(result.items[0].req_version).toBe("2");
    expect(result.total).toBe(25);
  });

  test("maps bootstrap's prefixed pending-request fields", async () => {
    const row = {
      req_id: "REQ-100001",
      req_date: "09/09/2026",
      pat_name: "Example Patient",
      department_name: "General Medicine",
      category_name: "General",
      cr_num: "093911260000001",
      hospital_service_name: "IPD",
      req_type: "Advance Refund",
      req_amount: "480.00",
      req_version: "2",
    };
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: bootstrapWire({
          pending_request_queue: [row],
          request_filter_options: {
            hospital_service_names: ["IPD", "OPD"],
            req_types: ["Advance Refund", "Service"],
            department_names: ["General Medicine"],
          },
        }),
      }),
    });
    const api = createCashCollectionApi({
      apiBaseUrl: "/api/cash-collection",
      requestTimeoutMs: 1000,
    });
    const result = await api.loadBootstrap();
    expect(result.requests[0]).toMatchObject({
      id: row.req_id,
      patient: row.pat_name,
      hospitalService: "IPD",
      requestType: "Advance Refund",
    });
    expect(result.requestFilterOptions).toEqual({
      hospitalServices: ["IPD", "OPD"],
      requestTypes: ["Advance Refund", "Service"],
      departments: ["General Medicine"],
    });
  });

  test("maps prefixed transaction fields to the display-row model", async () => {
    const row = {
      transaction_no: 88241,
      pat_name: "Example Patient",
      cr_num: 939112600000001,
      transaction_date_iso: "2026-09-09",
      transaction_time: "10:38 AM",
      payment_mode: "Cash",
      transaction_amount: 4280,
      transaction_status: "Completed",
      req_type: "Service",
      hospital_service_name: "OPD",
      billing_service_name: "Service",
    };
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { items: [row], total: 25, page: 0, size: 10 },
      }),
    });
    const api = createCashCollectionApi({
      apiBaseUrl: "/api/cash-collection",
      requestTimeoutMs: 1000,
    });
    const result = await api.listTransactions();

    expect(result.items[0]).toMatchObject({
      no: "88241",
      patient: "Example Patient",
      cr: "939112600000001",
      dateIso: "2026-09-09",
      time: "10:38 AM",
      mode: "Cash",
      amount: "4280",
      status: "Completed",
      requestType: "Service",
      hospitalService: "OPD",
      billingService: "Service",
    });
    expect(result.items[0].transaction_amount).toBe("4280");
    expect(result.total).toBe(25);
  });

  test("maps bootstrap's prefixed transaction fields", async () => {
    const row = {
      transaction_no: "REC-1",
      pat_name: "Example Patient",
      cr_num: "939112600000001",
      transaction_date_iso: "2026-09-09",
      transaction_time: "10:38 AM",
      payment_mode: "Cash",
      transaction_amount: "4280.00",
      transaction_status: "Completed",
      req_type: "Service",
      hospital_service_name: "OPD",
      billing_service_name: "Service",
    };
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: bootstrapWire({ recent_transaction_rows: [row] }),
      }),
    });
    const api = createCashCollectionApi({
      apiBaseUrl: "/api/cash-collection",
      requestTimeoutMs: 1000,
    });
    const result = await api.loadBootstrap();
    expect(result.recentTransactions[0]).toMatchObject({
      no: row.transaction_no,
      patient: row.pat_name,
      amount: row.transaction_amount,
    });
  });

  test("forwards the idempotency key and uses named transaction fields", async () => {
    const api = createCashCollectionApi({
      apiBaseUrl: "/api/cash-collection",
      credentials: "include",
      requestTimeoutMs: 1000,
    });
    await api.postTransaction({
      idempotencyKey: "fixed-key",
      source: "direct",
      requestType: "Receipt",
      workflowId: "tariff-entry",
      processingBillingServiceId: "10",
      patientId: "p-1",
      patientContextVersion: "pat-v1",
      workflowFields: { department_name: "Cardiology" },
      lines: [
        {
          code: "CONS-101",
          name: "Consultation",
          rate: 480,
          qty: 1,
          discount: 0,
          source: "direct",
        },
      ],
      displayedTotal: "480.00",
      payment: {
        mode: "Card",
        description: "",
        summary: "Debit Card ending 4821",
        cardType: "Debit Card",
        terminalId: "T1",
        terminalApproval: {
          terminalTransactionId: "POS-42",
          status: "APPROVED",
          approvalCode: "024-088501",
          cardLastFour: "4821",
        },
      },
    });
    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers["Idempotency-Key"]).toBe("fixed-key");
    expect(JSON.parse(options.body)).toEqual({
      collection_source: "direct",
      request_type: "Receipt",
      workflow_id: "tariff-entry",
      processing_billing_service_id: "10",
      pat_id: "p-1",
      pat_context_version: "pat-v1",
      workflow_fields: { department_name: "Cardiology" },
      tariff_lines: [
        {
          tariff_code: "CONS-101",
          tariff_name: "Consultation",
          tariff_rate: 480,
          tariff_qty: 1,
          tariff_discount_percent: 0,
          tariff_source: "direct",
        },
      ],
      transaction_total: "480.00",
      payment_details: {
        payment_mode: "Card",
        payment_description: "",
        payment_summary: "Debit Card ending 4821",
        card_type: "Debit Card",
        pos_terminal_id: "T1",
        terminal_payment: {
          terminal_transaction_id: "POS-42",
          transaction_status: "APPROVED",
          payment_approval_code: "024-088501",
          card_last_four: "4821",
        },
      },
      idempotency_key: "fixed-key",
    });
  });

  test("maps the prefixed posted-transaction response back to the print and dashboard models", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          transaction_document_no: "REC-1",
          transaction_status: "Completed",
          resolved_req_id: "REQ-1",
          dashboard_transaction_row: {
            transaction_no: "REC-1",
            pat_name: "Example Patient",
            cr_num: "939112600000001",
            transaction_date_iso: "2026-09-10",
            transaction_time: "10:38 AM",
            payment_mode: "Cash",
            transaction_amount: "480.00",
            transaction_status: "Completed",
            department_name: "Cardiology",
            category_name: "General",
            req_type: "Service",
            hospital_service_name: "OPD",
            billing_service_name: "Service",
          },
          printable_data: {
            transaction_document_no: "REC-1",
            transaction_document_type: "Receipt",
            transaction_document_date: "10/09/2026",
            patient_details: {
              pat_id: "p-1",
              pat_name: "Example Patient",
              cr_num: "939112600000001",
            },
            tariff_lines: [
              {
                tariff_code: "CONS-101",
                tariff_name: "Consultation",
                tariff_rate: 480,
              },
            ],
            payment_details: {
              payment_mode: "Cash",
              payment_summary: "Cash",
            },
            transaction_totals: {
              gross_amount: "480.00",
              discount_amount: "0.00",
              net_amount: "480.00",
            },
          },
        },
      }),
    });
    const api = createCashCollectionApi({
      apiBaseUrl: "/api/cash-collection",
      requestTimeoutMs: 1000,
    });

    const result = await api.postTransaction({ payment: {} });

    expect(result).toMatchObject({
      documentNumber: "REC-1",
      status: "Completed",
      resolvedRequestId: "REQ-1",
      dashboardTransaction: { no: "REC-1", amount: "480.00" },
    });
    expect(result.printableData).toMatchObject({
      documentNumber: "REC-1",
      documentDate: "10/09/2026",
      patient: { name: "Example Patient", cr: "939112600000001" },
      lines: [{ code: "CONS-101", name: "Consultation" }],
      payment: { mode: "Cash", summary: "Cash" },
      totals: { net: "480.00" },
    });
  });

  test("closes a shift with only its version and denomination quantities", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        trace_id: "trace-close",
        data: {
          shift_id: "shift/a",
          shift_status: "CLOSED",
          shift_business_date: "2026-09-10",
          shift_closed_at: "2026-09-10T17:30:00+05:30",
          expected_cash_amount: "1000.00",
          counted_cash_amount: "1000.00",
          cumulative_cash_amount: "1000.00",
          reconciliation_mode: "DENOMINATION",
          shift_version: "closed-v1",
          shift_summary_number: "SUMM-1",
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
      shift_version: "opaque-v2",
      reconciliation_mode: "DENOMINATION",
      denomination_counts: [
        { denomination_code: "NOTE_500", denomination_quantity: 2 },
      ],
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
    expect(JSON.parse(options.body)).toEqual({ shift_version: "closed-v1" });
  });
});
