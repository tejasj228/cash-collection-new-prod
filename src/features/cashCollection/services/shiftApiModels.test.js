import {
  normalizeClosedShift,
  normalizeShiftClosePreparation,
} from "./shiftApiModels";

test("accepts an API-owned denomination master", () => {
  const result = normalizeShiftClosePreparation({
    shiftId: "s1",
    version: "v1",
    businessDate: "2026-09-10",
    status: "OPEN",
    canClose: true,
    blockers: [],
    expectedCash: "700.00",
    previousSubmittedCash: "1000.00",
    cumulativeExpectedCash: "1700.00",
    denominations: [
      { code: "NOTE_500", kind: "NOTE", value: "500", label: "₹500" },
    ],
  });
  expect(result.denominations[0].code).toBe("NOTE_500");
});

test("rejects incomplete close responses", () => {
  expect(() => normalizeClosedShift({ status: "OPEN" })).toThrow(
    "completed shift close result",
  );
});
