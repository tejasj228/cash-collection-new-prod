import { resolveApplicationRuntime } from "./applicationRuntime";
import { createCashCollectionApi } from "../features/cashCollection/services/cashCollectionApi";
import { fetchLegacyPendingRequests } from "./legacyHbimsPendingRequests";
import { fetchLegacyPatientInfo } from "./legacyHbimsPatientInfo";
import { PROTOTYPE_DATA } from "../mocks/prototypeData";

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

test("legacy Direct Continue uses real pending patients without the unavailable REST eligibility API", async () => {
  const originalEnvironment = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";
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
    const { integration } = await resolveApplicationRuntime();
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
    process.env.NODE_ENV = originalEnvironment;
  }
});
