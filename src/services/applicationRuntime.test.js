import { resolveApplicationRuntime } from "./applicationRuntime";
import { createCashCollectionApi } from "../features/cashCollection/services/cashCollectionApi";
import { fetchLegacyPendingRequests } from "./legacyHbimsPendingRequests";
import { fetchLegacyPatientInfo } from "./legacyHbimsPatientInfo";
import { PROTOTYPE_DATA } from "../mocks/prototypeData";
import { fetchLegacyHospitalDetails } from "./legacyHbimsHospitalDetails";

jest.mock("../features/cashCollection/services/cashCollectionApi", () => ({
  createCashCollectionApi: jest.fn(),
}));
jest.mock("./legacyHbimsPendingRequests", () => ({
  ...jest.requireActual("./legacyHbimsPendingRequests"),
  fetchLegacyPendingRequests: jest.fn(),
}));
jest.mock("./legacyHbimsPatientInfo", () => ({
  fetchLegacyPatientInfo: jest.fn(),
}));
jest.mock("./legacyHbimsHospitalDetails", () => ({
  fetchLegacyHospitalDetails: jest.fn().mockResolvedValue({
    hospitalCode: "37913",
    name: "Hospital from API",
    subtitle: "API subtitle",
    address: "API address",
  }),
}));

test("legacy Direct Continue uses daily patients without the unavailable REST eligibility API", async () => {
  const originalFetch = global.fetch;
  global.fetch = jest
    .fn()
    .mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "success",
        data: [{ crno: "379132500000673", pat_name: "Patient" }],
      }),
    });
  const originalEnvironment = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";
  fetchLegacyHospitalDetails.mockResolvedValue({
    hospitalCode: "37913",
    name: "Hospital from API",
    subtitle: "API subtitle",
    address: "API address",
  });
  const unavailableEligibility = jest
    .fn()
    .mockRejectedValue(new Error("Request failed with status 400."));
  createCashCollectionApi.mockReturnValue({
    checkEligibility: unavailableEligibility,
  });
  const cr = "379132500000673";
  fetchLegacyPendingRequests.mockResolvedValue([
    {
      id: "request-1",
      cr,
      patient: "Patient",
      hospitalService: "OPD",
      dateIso: "2026-09-17",
    },
  ]);
  fetchLegacyPatientInfo.mockResolvedValue({
    cr,
    name: "Patient",
    status: "-",
  });
  try {
    const { integration, data } = await resolveApplicationRuntime();
    expect(data.facility).toMatchObject({
      hospitalCode: "37913",
      name: "Hospital from API",
      address: "API address",
    });
    const workflow = PROTOTYPE_DATA.billingByService["opd-normal"].Receipt.find(
      (option) => option.uiFamily === "tariff-entry",
    );
    const result = await integration.services.checkEligibility({
      source: "direct",
      crNumber: cr,
      hospitalServiceId: "opd-normal",
      requestType: "Receipt",
      billingServiceId: workflow.id,
      workflowId: workflow.uiFamily,
    });
    expect(result).toMatchObject({
      eligible: true,
      code: "PENDING_LIST_CONFIGURE",
    });
    expect(fetchLegacyPatientInfo).toHaveBeenCalledWith(cr);
    expect(unavailableEligibility).not.toHaveBeenCalled();
  } finally {
    global.fetch = originalFetch;
    process.env.NODE_ENV = originalEnvironment;
  }
});
