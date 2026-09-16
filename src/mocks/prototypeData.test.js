import { PROTOTYPE_DATA } from "./prototypeData";
import {
  RequestType,
  HOSPITAL_SERVICE_FAMILIES,
  BILLING_SERVICES_BY_FAMILY,
} from "../contracts/cashCollection.contract";

test("prototype bootstrap initializes with categorized pending requests", () => {
  expect(PROTOTYPE_DATA.requests.length).toBeGreaterThan(0);
  expect(
    PROTOTYPE_DATA.requests.every((request) => Boolean(request.category)),
  ).toBe(true);
});

test("prototype pending queue is populated for the dashboard day", () => {
  const sameDayRequests = PROTOTYPE_DATA.requests.filter(
    (request) => request.dateIso === PROTOTYPE_DATA.todayIso,
  );

  expect(sameDayRequests).toHaveLength(PROTOTYPE_DATA.requests.length);
  expect(PROTOTYPE_DATA.queueSummary.todayPendingCount).toBe(
    PROTOTYPE_DATA.requests.length,
  );
});

test("prototype dashboard includes every supported request type", () => {
  const sameDayTypes = new Set(
    PROTOTYPE_DATA.recentTransactions
      .filter((row) => row.dateIso === PROTOTYPE_DATA.todayIso)
      .map((row) => row.requestType),
  );

  expect(
    [...Object.values(RequestType)].every((type) => sameDayTypes.has(type)),
  ).toBe(true);
});

test("every prototype pending request carries a hospital service and a request type", () => {
  for (const request of PROTOTYPE_DATA.requests) {
    expect(HOSPITAL_SERVICE_FAMILIES).toContain(request.hospitalService);
    expect(Object.values(RequestType)).toContain(request.requestType);
    expect(request.type).toBeUndefined();
  }
  expect(PROTOTYPE_DATA.requestFilterOptions.hospitalServices).toEqual(
    [
      ...new Set(PROTOTYPE_DATA.requests.map((row) => row.hospitalService)),
    ].sort(),
  );
  expect(PROTOTYPE_DATA.requestFilterOptions.requestTypes).toEqual(
    [...new Set(PROTOTYPE_DATA.requests.map((row) => row.requestType))].sort(),
  );
});

test("prototype dashboard covers every hospital service × billing service bucket, both collected and refunded", () => {
  const sameDay = PROTOTYPE_DATA.recentTransactions.filter(
    (row) => row.dateIso === PROTOTYPE_DATA.todayIso,
  );
  const bucketsSeen = new Set(
    sameDay.map(
      (row) =>
        `${row.status === "Refunded" ? "refund" : "collect"}::${row.hospitalService}::${row.billingService}`,
    ),
  );

  const everyBucket = HOSPITAL_SERVICE_FAMILIES.flatMap((family) =>
    BILLING_SERVICES_BY_FAMILY[family].flatMap((service) => [
      `collect::${family}::${service}`,
      `refund::${family}::${service}`,
    ]),
  );

  expect(everyBucket.every((bucket) => bucketsSeen.has(bucket))).toBe(true);
});
