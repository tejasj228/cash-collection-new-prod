import { CASH_COLLECTION_ROUTES, sectionFromPath } from "./navigationRoutes";

describe("cash collection navigation", () => {
  test.each([
    [CASH_COLLECTION_ROUTES.collection, "collection"],
    [`${CASH_COLLECTION_ROUTES.collection}/patient`, "collection"],
    [CASH_COLLECTION_ROUTES.dashboard, "dashboard"],
    ["/cash-collection/reports", "dashboard"],
    ["/cash-collection/dashboard", "dashboard"],
  ])("maps %s to the %s section", (pathname, section) => {
    expect(sectionFromPath(pathname)).toBe(section);
  });
});
