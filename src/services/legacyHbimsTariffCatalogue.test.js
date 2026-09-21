import {
  buildTariffIndex,
  searchTariffIndex,
  createLegacyTariffCatalogue,
} from "./legacyHbimsTariffCatalogue";

const row = (code, name = code) => ({
  tariff_code: code,
  tariff_name: name,
  default_rate: 1725,
  group_name: "Surgery",
  group_id: 154,
  tariff_id: 1540001,
});
const context = { patientCategoryCode: 11, chargeTypeId: 1 };

test("prefix matching searches names and codes, deduplicates and preserves API order", () => {
  const index = buildTariffIndex([
    row("Z01", "Abdominal Surgery"),
    row("AB02", "Other"),
    row("AB01", "Abcde Test"),
    row("Y01", "Not abdominal"),
  ]);
  expect(
    searchTariffIndex(index, { search: " ab " }).items.map((item) => item.code),
  ).toEqual(["Z01", "AB02", "AB01"]);
  expect(
    searchTariffIndex(index, { groupId: 154 }).items.map((item) => item.code),
  ).toEqual(["Z01", "AB02", "AB01", "Y01"]);
  expect(searchTariffIndex(index, { search: "abcde" }).total).toBe(1);
  expect(searchTariffIndex(index, { search: "missing" })).toEqual({
    items: [],
    total: 0,
  });
});

test("all tariffs are paged ten at a time in API order", () => {
  const index = buildTariffIndex(
    Array.from({ length: 25 }, (_, i) =>
      row(`T${String(24 - i).padStart(2, "0")}`),
    ),
  );
  expect(searchTariffIndex(index).items.map((item) => item.code)).toEqual(
    Array.from({ length: 10 }, (_, i) => `T${24 - i}`),
  );
  const result = searchTariffIndex(index, { page: 2 });
  expect(result.total).toBe(25);
  expect(result.items).toHaveLength(5);
  expect(result.items[0].code).toBe("T04");
});

test("duplicate tariff codes receive stable independent catalogue keys", () => {
  const index = buildTariffIndex([
    row("DUP", "First rate"),
    { ...row("DUP", "Second rate"), default_rate: 2500 },
  ]);
  expect(index.items.map((item) => item.catalogueKey)).toEqual([
    "catalogue-row-0",
    "catalogue-row-1",
  ]);
});

test("concurrent searches and later pages share one request; categories are isolated", async () => {
  const fetchJson = jest.fn().mockResolvedValue({
    status: "success",
    data: [row("ABD001", "GASTROSCOPY-(ABD001)")],
  });
  const api = createLegacyTariffCatalogue(fetchJson);
  const results = await Promise.all([
    api.getTariffPage(context),
    api.getTariffPage({ ...context, search: "gas" }),
    api.preloadTariffs(context),
  ]);
  expect(results[1].items[0]).toEqual(
    expect.objectContaining({
      code: "ABD001",
      rate: 1725,
      legacyTariffId: "1540001",
    }),
  );
  await api.getTariffPage({ ...context, page: 1 });
  expect(fetchJson).toHaveBeenCalledTimes(1);
  expect(fetchJson).toHaveBeenCalledWith(expect.any(String), {
    ipdChargeType: "0",
    chargeType: "1",
    patientCatCode: "11",
    tariffCode: "0",
  });
  await api.getTariffPage({ ...context, patientCategoryCode: 12 });
  expect(fetchJson).toHaveBeenCalledTimes(2);
});

test("failed catalogues can be retried and missing patient category never sends a request", async () => {
  const fetchJson = jest
    .fn()
    .mockResolvedValueOnce({ status: "error" })
    .mockResolvedValue({ status: "success", data: [] });
  const api = createLegacyTariffCatalogue(fetchJson);
  await expect(api.getTariffPage(context)).rejects.toThrow(
    "valid tariff catalogue",
  );
  await expect(api.getTariffPage(context)).resolves.toEqual({
    items: [],
    total: 0,
  });
  await expect(api.getTariffPage({ chargeTypeId: 1 })).rejects.toThrow(
    "Patient category",
  );
  expect(fetchJson).toHaveBeenCalledTimes(2);
});
