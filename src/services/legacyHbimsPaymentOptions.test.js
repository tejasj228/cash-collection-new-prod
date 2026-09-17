import { fetchLegacyPaymentOptions } from "./legacyHbimsPaymentOptions";
import {
  fetchLegacyJson,
  PAYMENT_CATEGORY_MAPPING_URL,
} from "../utilities/sessionService";
jest.mock("../utilities/sessionService", () => ({
  fetchLegacyJson: jest.fn(),
  PAYMENT_CATEGORY_MAPPING_URL: "/mapping",
}));
test("maps real payment IDs and uses the legacy receipt/category query", async () => {
  fetchLegacyJson.mockResolvedValue({
    status: "success",
    data: [{ paymode: "Qr Code", paydtls: "16#QR Code#0#0#0" }],
  });
  expect(
    await fetchLegacyPaymentOptions({
      requestType: "Receipt",
      patientCategoryCode: 11,
    }),
  ).toEqual({
    modes: ["QR Code"],
    modeDetails: { "QR Code": { id: "16", paydtls: "16#QR Code#0#0#0" } },
  });
  expect(fetchLegacyJson).toHaveBeenCalledWith(PAYMENT_CATEGORY_MAPPING_URL, {
    reqType: "1",
    patCategory: "11",
    patReceiptPaymode: "0",
    chargeId: "0",
  });
});
test("refund requests use type two; invalid responses never fall back", async () => {
  fetchLegacyJson.mockResolvedValue({ status: "error" });
  await expect(
    fetchLegacyPaymentOptions({
      requestType: "Refund",
      patientCategoryCode: 11,
    }),
  ).rejects.toThrow("invalid response");
  expect(fetchLegacyJson.mock.calls.at(-1)[1].reqType).toBe("2");
});
