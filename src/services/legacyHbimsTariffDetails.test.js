import {
  fetchLegacyTariffDetails,
  mapLegacyTariffDetailsRow,
} from "./legacyHbimsTariffDetails";
import {
  fetchLegacyJson,
  TARIFF_DETAILS_URL,
} from "../utilities/sessionService";

jest.mock("../utilities/sessionService", () => ({
  fetchLegacyJson: jest.fn(),
  TARIFF_DETAILS_URL: "/cashcollectionreqbased/tariffdetails",
}));

const row = {
  tariff_code: 1210137,
  tariff_name: "Urine Ketones",
  tariff_group_name: "Biochemistry",
  tariff_rate: 30,
  tariff_qty: 1,
  tariff_discount_percent: 0,
  gstr_tariff_id: "10142",
  net_cost: "30.00",
  hrgnum_puk: 379132000151071,
  staff_card_no_id: "not-for-display",
};

beforeEach(() => jest.clearAllMocks());

test("maps the provided response to the existing tariff model and excludes unrelated fields", () => {
  const line = mapLegacyTariffDetailsRow(row, "379132000151071");
  expect(line).toMatchObject({
    code: "1210137",
    name: "Urine Ketones",
    group: "Biochemistry",
    rate: 30,
    qty: 1,
    discount: 0,
    netCost: "30.00",
  });
  expect(line).not.toHaveProperty("staff_card_no_id");
});

test("uses reqNo with the centralized session request helper", async () => {
  fetchLegacyJson.mockResolvedValue({ status: "success", data: [row] });
  await expect(
    fetchLegacyTariffDetails("379137260000189", "379132000151071"),
  ).resolves.toHaveLength(1);
  expect(fetchLegacyJson).toHaveBeenCalledWith(TARIFF_DETAILS_URL, {
    reqNo: "379137260000189",
  });
});

test("rejects failed or malformed payloads and never substitutes fixture tariffs", async () => {
  for (const payload of [
    { status: "error", data: [row] },
    { status: "success", data: {} },
    null,
  ]) {
    fetchLegacyJson.mockResolvedValue(payload);
    await expect(fetchLegacyTariffDetails("REQ")).rejects.toThrow(
      "valid tariff details",
    );
  }
  fetchLegacyJson.mockRejectedValue(new Error("Network failed"));
  await expect(fetchLegacyTariffDetails("REQ")).rejects.toThrow(
    "Network failed",
  );
});

test("allows an empty server array without inventing lines", async () => {
  fetchLegacyJson.mockResolvedValue({ status: "success", data: [] });
  await expect(fetchLegacyTariffDetails("REQ")).resolves.toEqual([]);
});

test("rejects mismatched patient and invalid monetary inputs", () => {
  expect(() => mapLegacyTariffDetailsRow(row, "another-cr")).toThrow(
    "different patient",
  );
  for (const patch of [
    { tariff_rate: "NaN" },
    { tariff_qty: -1 },
    { tariff_discount_percent: 101 },
    { tariff_rate: null },
    { tariff_code: "" },
  ])
    expect(() => mapLegacyTariffDetailsRow({ ...row, ...patch })).toThrow();
});
