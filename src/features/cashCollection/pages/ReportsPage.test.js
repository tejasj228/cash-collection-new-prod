import { formatDateInput, isoFromDisplayDate } from "../model/reportDates";

describe("report date handling", () => {
  test("formats numeric entry as DD/MM/YYYY", () => {
    expect(formatDateInput("03092024")).toBe("03/09/2024");
  });

  test("rejects impossible dates", () => {
    expect(isoFromDisplayDate("31/02/2024")).toBeNull();
    expect(isoFromDisplayDate("03/09/2024")).toBe("2024-09-03");
  });
});
