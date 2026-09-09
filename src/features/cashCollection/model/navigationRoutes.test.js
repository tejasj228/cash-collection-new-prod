import { CASH_COLLECTION_ROUTES, sectionFromPath } from "./navigationRoutes";

describe("cash collection navigation", () => {
  test.each([
    [CASH_COLLECTION_ROUTES.collection, "collection"],
    [`${CASH_COLLECTION_ROUTES.collection}/patient`, "collection"],
    [CASH_COLLECTION_ROUTES.overview, "overview"],
    [CASH_COLLECTION_ROUTES.reports, "reports"],
  ])("maps %s to the %s section", (pathname, section) => {
    expect(sectionFromPath(pathname)).toBe(section);
  });
});
