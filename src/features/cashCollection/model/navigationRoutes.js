export const CASH_COLLECTION_ROUTES = Object.freeze({
  collection: "/cash-collection/collection",
  // The shift dashboard keeps the historic /overview path so existing
  // bookmarks and JSP mounts still resolve.
  dashboard: "/cash-collection/overview",
});

export function sectionFromPath(pathname) {
  if (
    pathname.startsWith(CASH_COLLECTION_ROUTES.dashboard) ||
    pathname.startsWith("/cash-collection/reports") ||
    pathname.startsWith("/cash-collection/dashboard")
  )
    return "dashboard";
  return "collection";
}
