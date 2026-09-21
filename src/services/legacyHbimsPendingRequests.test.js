import {
  createPendingRequestStore,
  mapLegacyPendingRequestRow,
} from "./legacyHbimsPendingRequests";

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

test("quiet polling refreshes every 30 seconds, pauses while hidden and only notifies on changes", async () => {
  let scheduled;
  let hidden = false;
  const listener = jest.fn();
  const initial = [{ id: "1" }];
  const fetchRequests = jest
    .fn()
    .mockResolvedValueOnce(initial)
    .mockResolvedValueOnce([{ id: "2" }]);
  const store = createPendingRequestStore(initial, fetchRequests, {
    intervalMs: 30000,
    isHidden: () => hidden,
    setTimeoutFn: (callback, delay) => {
      scheduled = callback;
      expect(delay).toBe(30000);
      return 1;
    },
    clearTimeoutFn: jest.fn(),
  });
  const unsubscribe = store.subscribePendingRequests(listener);

  await scheduled();
  expect(fetchRequests).toHaveBeenCalledTimes(1);
  expect(listener).not.toHaveBeenCalled();

  await scheduled();
  expect(fetchRequests).toHaveBeenCalledTimes(2);
  expect(listener).toHaveBeenCalledTimes(1);
  expect(store.getPendingRequestsSnapshot()).toEqual([{ id: "2" }]);

  hidden = true;
  await scheduled();
  expect(fetchRequests).toHaveBeenCalledTimes(2);
  unsubscribe();
});

test("manual refresh calls share one request instead of overlapping", async () => {
  let resolveRequest;
  const fetchRequests = jest.fn(
    () =>
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
  );
  const store = createPendingRequestStore([], fetchRequests, {
    isHidden: () => false,
  });
  const first = store.refreshPendingRequests();
  const second = store.refreshPendingRequests();
  expect(fetchRequests).toHaveBeenCalledTimes(1);
  resolveRequest([]);
  await Promise.all([first, second]);
});
