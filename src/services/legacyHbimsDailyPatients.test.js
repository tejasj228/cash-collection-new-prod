import { createDailyPatientQueries } from "./legacyHbimsDailyPatients";
import { DAILY_PATIENT_LIST_URL } from "../utilities/sessionService";

const payload = {
  status: "success",
  data: Array.from({ length: 21 }, (_, i) => ({
    crno: String(1000 + i),
    pat_name: ` Patient  ${i} `,
  })),
};

test("daily listing is paginated, cached and searchable without per-row detail calls", async () => {
  const fetchJson = jest.fn().mockResolvedValue(payload);
  const details = jest.fn();
  const api = createDailyPatientQueries(details, fetchJson);
  const [first, second] = await Promise.all([
    api.searchPatientPage(),
    api.searchPatientPage({ page: 1 }),
  ]);
  expect(first.items).toHaveLength(10);
  expect(first.total).toBe(21);
  expect(first.items[0]).toMatchObject({ cr: "1000", name: "Patient 0" });
  expect(second.items[0].cr).toBe("1010");
  expect(fetchJson).toHaveBeenCalledTimes(1);
  expect(fetchJson).toHaveBeenCalledWith(DAILY_PATIENT_LIST_URL);
  expect(
    (await api.searchPatientPage({ query: "Patient 20", searchField: "name" }))
      .items,
  ).toHaveLength(1);
  expect(
    (await api.searchPatientPage({ query: "1000", searchField: "cr" })).items,
  ).toHaveLength(1);
  expect(details).not.toHaveBeenCalled();
  await expect(
    api.searchPatientPage({ query: "123", searchField: "mobile" }),
  ).rejects.toThrow(/CR number or patient name/);
});

test("duplicate CR rows stay distinct; exact selection resolves full patient details", async () => {
  const details = jest
    .fn()
    .mockResolvedValue({
      cr: "123",
      name: "Canonical patient",
      mobile: "999",
      isAdmitted: false,
    });
  const api = createDailyPatientQueries(
    details,
    jest.fn().mockResolvedValue({
      status: "success",
      data: [
        { crno: 123, pat_name: "Name one" },
        { crno: 123, pat_name: "Name two" },
      ],
    }),
  );
  const list = await api.searchPatientPage();
  expect(list.total).toBe(2);
  expect(list.items[0].id).not.toBe(list.items[1].id);
  expect(
    (await api.searchPatientPage({ query: "123", exactCr: true })).items,
  ).toEqual([
    {
      cr: "123",
      name: "Canonical patient",
      mobile: "999",
      isAdmitted: false,
      listServiceFamily: "OPD",
    },
  ]);
  expect(details).toHaveBeenCalledTimes(1);
});

test("failed daily loads are retryable, not replaced with fixture patients", async () => {
  const fetchJson = jest
    .fn()
    .mockResolvedValueOnce({ status: "error" })
    .mockResolvedValueOnce(payload);
  const api = createDailyPatientQueries(jest.fn(), fetchJson);
  await expect(api.searchPatientPage()).rejects.toThrow(
    /valid daily patient list/,
  );
  expect((await api.searchPatientPage()).total).toBe(21);
});
