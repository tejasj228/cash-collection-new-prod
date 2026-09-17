import { createPendingListPatientQueries } from "./legacyHbimsDirectPatients";

test("deduplicates pending-list CRs and hydrates only ten patients per page", async () => {
  const rows = Array.from({ length: 15 }, (_, i) => ({
    cr: String(i),
    patient: `Patient ${i}`,
    hospitalService: "OPD",
    dateIso: `2026-09-${String(i + 1).padStart(2, "0")}`,
  }));
  const loadInfo = jest.fn(async (cr) => ({
    cr,
    name: `Patient ${cr}`,
    status: "-",
  }));
  const api = createPendingListPatientQueries(
    async () => [...rows, rows[0]],
    loadInfo,
  );
  const first = await api.searchPatientPage({
    hospitalServiceId: "opd-normal",
    page: 0,
  });
  expect(first.total).toBe(15);
  expect(first.items).toHaveLength(10);
  expect(first.items[0].cr).toBe("14");
  expect(loadInfo).toHaveBeenCalledTimes(10);
  loadInfo.mockClear();
  const second = await api.searchPatientPage({
    hospitalServiceId: "emergency",
    page: 1,
  });
  expect(second.items).toHaveLength(5);
  expect(loadInfo).toHaveBeenCalledTimes(5);
});

test("groups IPD request CRs separately and searches available name/CR/phone fields", async () => {
  const rows = [
    { cr: "1", patient: "One", hospitalService: "OPD", dateIso: "2026-09-01" },
    { cr: "1", patient: "One", hospitalService: "IPD", dateIso: "2026-08-01" },
    {
      cr: "2",
      patient: "Two",
      mobile: "9876543210",
      hospitalService: "OPD",
      dateIso: "2026-09-02",
    },
  ];
  const api = createPendingListPatientQueries(
    async () => rows,
    async (cr) => ({
      cr,
      name: cr === "2" ? "Two" : "One",
      mobile: cr === "2" ? "9876543210" : "1234567890",
    }),
  );
  expect(
    (await api.searchPatientPage({ hospitalServiceId: "ipd" })).items.map(
      (p) => p.cr,
    ),
  ).toEqual(["1"]);
  expect(
    (
      await api.searchPatientPage({
        hospitalServiceId: "opd-special",
        query: "Two, 987654",
      })
    ).items.map((p) => p.cr),
  ).toEqual(["2"]);
  expect(
    (
      await api.searchPatientPage({
        hospitalServiceId: "opd-normal",
        exactCr: true,
        query: "1",
      })
    ).total,
  ).toBe(0);
});

test("phone search covers off-page patinfo phones and caches them for paging", async () => {
  const rows = Array.from({ length: 12 }, (_, i) => ({
    cr: String(i),
    patient: `Patient ${i}`,
    hospitalService: "OPD",
    dateIso: "2026-09-01",
  }));
  const loadInfo = jest.fn(async (cr) => ({
    cr,
    name: `Patient ${cr}`,
    mobile: cr === "11" ? "9876543210" : "1111111111",
  }));
  const api = createPendingListPatientQueries(async () => rows, loadInfo);
  const result = await api.searchPatientPage({
    hospitalServiceId: "emergency",
    query: "987654",
  });
  expect(result.items.map((p) => p.cr)).toEqual(["11"]);
  expect(loadInfo).toHaveBeenCalledTimes(12);
  await api.searchPatientPage({
    hospitalServiceId: "emergency",
    query: "987654",
  });
  expect(loadInfo).toHaveBeenCalledTimes(12);
});
