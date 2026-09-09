import {
  lineDiscountAmount,
  lineDiscountPercent,
  lineGross,
  lineNet,
} from "./chargeCalculations";

describe("charge calculations", () => {
  test("treats discount as a percentage of rate multiplied by quantity", () => {
    const line = { rate: 1200, qty: 6, discount: 10 };
    expect(lineGross(line)).toBe(7200);
    expect(lineDiscountAmount(line)).toBe(720);
    expect(lineNet(line)).toBe(6480);
  });

  test("clamps discount percentages to the allowed range", () => {
    expect(lineDiscountPercent({ discount: -5 })).toBe(0);
    expect(lineDiscountPercent({ discount: 125 })).toBe(100);
  });
});
