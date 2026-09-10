import { computeShiftSummary } from "./shiftSummary";

test("failed and unposted transactions do not increase collected totals", () => {
  const summary = computeShiftSummary([
    { status: "Completed", mode: "Cash", amount: "500.00" },
    { status: "Failed", mode: "Card", amount: "900.00" },
    { status: "Unposted", mode: "UPI", amount: "700.00" },
  ]);

  expect(summary.bills).toBe(3);
  expect(summary.collectionCount).toBe(1);
  expect(summary.collectedTotal).toBe(500);
  expect(summary.net).toBe(500);
  expect(summary.cashCollected).toBe(500);
});

test("cash in drawer is cash collections minus cash refunds only", () => {
  const summary = computeShiftSummary([
    { status: "Completed", mode: "Cash", amount: "1300.00" },
    { status: "Refunded", mode: "Cash", amount: "300.00" },
    { status: "Completed", mode: "UPI", amount: "500.00" },
    { status: "Refunded", mode: "Card", amount: "100.00" },
  ]);

  expect(summary.collectedTotal).toBe(1800);
  expect(summary.refundTotal).toBe(400);
  expect(summary.net).toBe(1400);
  expect(summary.cashInDrawer).toBe(1000);
});
