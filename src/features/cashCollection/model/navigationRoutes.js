export const CASH_COLLECTION_ROUTES = Object.freeze({
  collection: "/cash-collection/collection",
  overview: "/cash-collection/overview",
  reports: "/cash-collection/reports",
});

export function sectionFromPath(pathname) {
  if (pathname.startsWith(CASH_COLLECTION_ROUTES.overview)) return "overview";
  if (pathname.startsWith(CASH_COLLECTION_ROUTES.reports)) return "reports";
  return "collection";
}
