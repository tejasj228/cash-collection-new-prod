import { PROTOTYPE_DATA } from "./prototypeData";
import {
  RequestChargeType,
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

test("prototype dashboard includes every supported request charge type", () => {
  const sameDayTypes = new Set(
    PROTOTYPE_DATA.recentTransactions
      .filter((row) => row.dateIso === PROTOTYPE_DATA.todayIso)
      .map((row) => row.requestType),
  );

  expect(
    [...Object.values(RequestChargeType)].every((type) =>
      sameDayTypes.has(type),
    ),
  ).toBe(true);
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
