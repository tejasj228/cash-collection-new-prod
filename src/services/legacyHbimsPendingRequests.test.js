import { mapLegacyPendingRequestRow } from "./legacyHbimsPendingRequests";

const baseRow = {
  req_date: "17-Sep-2026",
  pat_name: "Test Patient",
  cr_num: "123456789012345",
  sblnum_chargetype_id: 1,
  sblnum_bservice_id: 10,
  req_no: "987654",
  req_amount: 250,
};

test("maps a receipt row to its canonical queue request type", () => {
  const request = mapLegacyPendingRequestRow({
    ...baseRow,
    req_type: "Receipt/Service",
    hblnum_req_type: 1,
  });

  expect(request.requestType).toBe("Service");
  expect(request.requestTypeLabel).toBe("Receipt/Service");
});

test("keeps the refund operation when the combined label ends in Service", () => {
  const request = mapLegacyPendingRequestRow({
    ...baseRow,
    req_type: "Refund/Service",
    hblnum_req_type: 2,
  });

  expect(request.requestType).toBe("Refund");
  expect(request.requestTypeLabel).toBe("Refund/Service");
});

test("maps an advance refund to its dedicated workflow request type", () => {
  const request = mapLegacyPendingRequestRow({
    ...baseRow,
    sblnum_chargetype_id: 2,
    sblnum_bservice_id: 19,
    req_type: "Refund/Advance",
    hblnum_req_type: 2,
  });

  expect(request.requestType).toBe("Advance Refund");
});

test("uses the textual refund prefix when the numeric kind is serialized away", () => {
  const request = mapLegacyPendingRequestRow({
    ...baseRow,
    req_type: "Refund/Service",
  });

  expect(request.requestType).toBe("Refund");
});
